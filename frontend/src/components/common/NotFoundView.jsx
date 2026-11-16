import React from 'react';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { useRouter } from '../../context/RouterContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const NotFoundView = ({ message = 'The page or roadmap you are looking for does not exist.' }) => {
  const { navigate } = useRouter();

  return (
    <div className="max-w-xl mx-auto py-16 px-4">
      <Card className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-accent-soft text-accent flex items-center justify-center mx-auto">
          <FileQuestion className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-ink">404 - Not Found</h1>
          <p className="text-sm text-muted">{message}</p>
        </div>
        <div className="pt-2 flex justify-center">
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('#/roadmaps')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Roadmaps</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotFoundView;
