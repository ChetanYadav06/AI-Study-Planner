import React from 'react';
import { Button } from '../ui/Button';

export const StudentPortalLanding = ({ onOpenAuth }) => {
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center text-center">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold text-ink tracking-tight">
            AI Study Planner
          </h1>
          <p className="text-sm sm:text-base text-muted max-w-lg mx-auto leading-relaxed">
            Plan study goals, generate day-by-day roadmaps, and track your daily study sessions.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => onOpenAuth('register')}
          >
            Create account
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => onOpenAuth('login')}
          >
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StudentPortalLanding;
