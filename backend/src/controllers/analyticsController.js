const analyticsService = require('../services/analyticsService');

/**
 * Overview Analytics
 * GET /api/analytics/overview
 */
const getOverview = async (req, res) => {
  try {
    const data = await analyticsService.getOverviewAnalytics(req.user);
    return res.status(200).json({
      success: true,
      message: 'Analytics overview retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('Error in getOverview:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Team Velocity Analytics
 * GET /api/analytics/team-velocity
 */
const getTeamVelocity = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await analyticsService.getTeamVelocityAnalytics(req.user, { startDate, endDate });
    return res.status(200).json({
      success: true,
      message: 'Team velocity analytics retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('Error in getTeamVelocity:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Project Burndown Analytics
 * GET /api/analytics/burndown/:projectId
 */
const getBurndown = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    if (isNaN(projectId) || projectId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Project ID must be a positive integer',
      });
    }

    const result = await analyticsService.getProjectBurndownAnalytics(projectId, req.user);
    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Project burndown analytics retrieved successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error in getBurndown:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getOverview,
  getTeamVelocity,
  getBurndown,
};
