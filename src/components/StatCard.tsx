  import React from 'react';
  import { Card, CardContent } from "@/components/ui/card";
  import { LucideIcon } from "lucide-react";

  interface StatCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: LucideIcon;
  }

  export const StatCard = ({ title, value, description, icon: Icon }: StatCardProps) => {
    return (
      <Card>
        <CardContent className="flex items-center p-6">
          <div className="mr-4 rounded-full bg-primary/10 p-2">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
