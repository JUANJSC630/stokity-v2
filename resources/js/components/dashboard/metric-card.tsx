import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

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
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
                {trend && (
                    <div className="mt-2 flex items-center">
                        <Badge variant={trend.isPositive ? 'default' : 'destructive'} className="text-xs">
                            {trend.isPositive ? (
                                <TrendingUp className="mr-1 h-3 w-3" />
                            ) : trend.value === 0 ? (
                                <Minus className="mr-1 h-3 w-3" />
                            ) : (
                                <TrendingDown className="mr-1 h-3 w-3" />
                            )}
                            {trend.value > 0 ? '+' : ''}
                            {trend.value}%
                        </Badge>
                        <span className="ml-2 text-xs text-muted-foreground">vs ayer</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
