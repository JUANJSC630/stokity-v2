import { Eye } from 'lucide-react';
import { Button } from '../ui/button';

interface EyeButtonProps {
    text: string;
}

export default function EyeButton({ text }: EyeButtonProps) {
    return (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Eye className="size-4" />
            <span className="sr-only">{text}</span>
        </Button>
    );
}
