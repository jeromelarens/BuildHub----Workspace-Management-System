const db = require('../config/database');
const { recordTaskActivity } = require('./activityService');
const { createNotification } = require('./notificationService');

/**
 * Calculate the next run date based on recurrence frequency and interval
 * @param {string} frequency 
 * @param {number} intervalCount 
 * @param {number|null} dayOfWeek 
 * @param {number|null} dayOfMonth 
 * @param {Date} [baseDate]
 * @returns {string} ISO Date string YYYY-MM-DD
 */
const calculateNextRunDate = (frequency, intervalCount = 1, dayOfWeek = null, dayOfMonth = null, baseDate = new Date()) => {
  const current = new Date(baseDate);
  // Normalize to UTC midnight
  const nextDate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()));

  const interval = Math.max(1, parseInt(intervalCount, 10) || 1);

  if (frequency === 'daily') {
    nextDate.setUTCDate(nextDate.getUTCDate() + interval);
  } else if (frequency === 'weekly') {
    if (dayOfWeek !== null && dayOfWeek !== undefined) {
      const targetDay = parseInt(dayOfWeek, 10);
      const currentDay = nextDate.getUTCDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7;
      nextDate.setUTCDate(nextDate.getUTCDate() + diff + ((interval - 1) * 7));
    } else {
      nextDate.setUTCDate(nextDate.getUTCDate() + (interval * 7));
    }
  } else if (frequency === 'monthly') {
    if (dayOfMonth !== null && dayOfMonth !== undefined) {
      const targetDate = parseInt(dayOfMonth, 10);
      nextDate.setUTCMonth(nextDate.getUTCMonth() + interval);
      nextDate.setUTCDate(Math.min(targetDate, 28)); // Safe day boundary
    } else {
      nextDate.setUTCMonth(nextDate.getUTCMonth() + interval);
    }
  } else if (frequency === 'custom') {
    nextDate.setUTCDate(nextDate.getUTCDate() + interval);
  } else {
    nextDate.setUTCDate(nextDate.getUTCDate() + interval);
  }

  return nextDate.toISOString().slice(0, 10);
};

/**
 * Process due recurring task rules and generate new task instances
 * Idempotent & transaction-safe.
 */
const processRecurringTasks = async () => {
  const client = await db.pool.connect();
  let generatedCount = 0;

  try {
    const today = new Date().toISOString().slice(0, 10);

    // Fetch active rules that are due
    const rulesQuery = `
      SELECT rr.id AS rule_id, rr.task_id, rr.frequency, rr.interval_count,
             rr.day_of_week, rr.day_of_month, rr.next_run_date, rr.end_date,
             t.title, t.description, t.priority, t.project_id, t.assigned_to, t.user_id
      FROM task_recurrence_rules rr
      JOIN tasks t ON rr.task_id = t.id
      WHERE rr.is_active = TRUE 
        AND rr.next_run_date <= $1
        AND (rr.end_date IS NULL OR rr.next_run_date <= rr.end_date)
      FOR UPDATE OF rr
    `;

    await client.query('BEGIN');
    const rulesRes = await client.query(rulesQuery, [today]);

    for (const rule of rulesRes.rows) {
      // Create new instance of task
      const insertTask = `
        INSERT INTO tasks (title, description, status, priority, due_date, project_id, assigned_to, user_id)
        VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7)
        RETURNING id, title, project_id, assigned_to, user_id
      `;
      const taskRes = await client.query(insertTask, [
        rule.title,
        rule.description,
        rule.priority,
        rule.next_run_date,
        rule.project_id,
        rule.assigned_to,
        rule.user_id,
      ]);

      const newTask = taskRes.rows[0];
      generatedCount++;

      // Compute next run date
      const nextRunDate = calculateNextRunDate(
        rule.frequency,
        rule.interval_count,
        rule.day_of_week,
        rule.day_of_month,
        new Date(rule.next_run_date)
      );

      const hasReachedEnd = rule.end_date && nextRunDate > (rule.end_date.toISOString ? rule.end_date.toISOString().slice(0, 10) : String(rule.end_date).slice(0, 10));

      // Update recurrence rule
      await client.query(`
        UPDATE task_recurrence_rules
        SET next_run_date = $1,
            is_active = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [nextRunDate, !hasReachedEnd, rule.rule_id]);

      // Record activity
      await client.query(`
        INSERT INTO task_activities (task_id, user_id, action, field_name, old_value, new_value)
        VALUES ($1, $2, 'created', 'recurrence', NULL, $3)
      `, [newTask.id, rule.user_id, `Generated from recurring rule (${rule.frequency})`]);

      // Notify assignee if assigned
      if (newTask.assigned_to) {
        await createNotification({
          userId: newTask.assigned_to,
          type: 'task_assigned',
          title: `New Recurring Task Instance: ${newTask.title}`,
          message: `A new recurring instance of task "${newTask.title}" has been generated and assigned to you.`,
          entityType: 'task',
          entityId: newTask.id,
        });
      }
    }

    await client.query('COMMIT');
    return { success: true, generatedCount };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in processRecurringTasks:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  calculateNextRunDate,
  processRecurringTasks,
};
