import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export function MetricCard({ title, value, description, icon, trend, className }: MetricCardProps) {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {icon && (
                    <div className="h-4 w-4 text-muted-foreground">
                        {icon}
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                )}
                {trend && (
                    <div className="flex items-center mt-2">
                        <Badge 
                            variant={trend.isPositive ? "default" : "destructive"}
                            className="text-xs"
                        >
                            {trend.isPositive ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                            ) : trend.value === 0 ? (
                                <Minus className="h-3 w-3 mr-1" />
                            ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {trend.value > 0 ? '+' : ''}{trend.value}%
                        </Badge>
                    </div>
                )}
            </CardContent>
        </Card>
    );
} 