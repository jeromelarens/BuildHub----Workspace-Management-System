import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Play, Pause, RotateCcw, Clock, Info } from 'lucide-react';

export interface TaskTimerCardProps {
  taskId: number | string;
  taskTitle: string;
}

export const TaskTimerCard: React.FC<TaskTimerCardProps> = ({
  taskId,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(0);
  };

  return (
    <Card className="p-4 bg-dark-surface border-dark-borderSubtle space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand" />
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Focus Session Timer
          </h4>
        </div>
        <span className="text-[10px] font-mono text-text-muted">TASK-{taskId}</span>
      </div>

      {/* Timer Digits Display */}
      <div className="py-2.5 px-4 rounded-xl bg-dark-elevated border border-dark-borderSubtle/60 text-center font-mono text-2xl font-extrabold tracking-wider text-text-primary selection:bg-brand">
        {formatTime(seconds)}
      </div>

      {/* Timer Controls */}
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRunning(false)}
            leftIcon={<Pause className="w-3.5 h-3.5 text-status-warning" />}
            className="flex-1"
          >
            Pause
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsRunning(true)}
            leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
            className="flex-1 shadow-lemon-sm"
          >
            Start Timer
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={seconds === 0}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          className="px-3"
          aria-label="Reset timer"
        >
          Reset
        </Button>
      </div>

      {/* Scope Disclaimer */}
      <div className="text-[10px] text-text-muted flex items-start gap-1.5 pt-1 border-t border-dark-borderSubtle/50">
        <Info className="w-3 h-3 text-brand shrink-0 mt-0.5" />
        <span>
          Local sprint focus stopwatch. Persistent timesheets require a future backend service.
        </span>
      </div>
    </Card>
  );
};
