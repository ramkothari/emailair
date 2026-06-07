export type AutomationScheduleType =
  | "once"
  | "daily"
  | "weekly"
  | "monthly"
  | "interval";

export type AutomationScheduleValue =
  | {
      type: "once";
      runAt: string;
      timezone?: string;
    }
  | {
      type: "daily";
      time: string;
      timezone?: string;
    }
  | {
      type: "weekly";
      dayOfWeek: number;
      time: string;
      timezone?: string;
    }
  | {
      type: "monthly";
      dayOfMonth: number;
      time: string;
      timezone?: string;
    }
  | {
      type: "interval";
      every: number;
      unit: "minutes" | "hours" | "days";
    };

export type AutomationCondition =
  | {
      field: "sender";
      operator: "contains";
      value: string;
    }
  | {
      field: "subject";
      operator: "contains";
      value: string;
    }
  | {
      field: "unread";
      operator: "is";
      value: boolean;
    }
  | {
      field: "has_attachment";
      operator: "is";
      value: boolean;
    }
  | {
      field: "category";
      operator: "equals";
      value: string;
    }
  | {
      field: "label";
      operator: "contains";
      value: string;
    }
  | {
      field: "older_than_days";
      operator: "greater_than";
      value: number;
    }
  | {
      field: "received_between";
      operator: "between";
      value: {
        from: string;
        to: string;
      };
    }
  | {
      field: "before_date";
      operator: "before";
      value: string;
    }
  | {
      field: "after_date";
      operator: "after";
      value: string;
    };

export type AutomationConditionJson =
  | AutomationCondition
  | {
      operator: "and";
      conditions: AutomationCondition[];
    };

export type AutomationActionType =
  | "archive"
  | "delete"
  | "export"
  | "mark_read";

export type AutomationActionJson = {
  type: AutomationActionType;
};

export type AutomationRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type AutomationRecord = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  enabled: boolean;
  scheduleType: AutomationScheduleType | null;
  scheduleValue: AutomationScheduleValue | null;
  conditionJson: AutomationConditionJson | null;
  actionJson: AutomationActionJson | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AutomationPreviewResult = {
  query: string;
  count: number;
  capped: boolean;
  limit: number;
  breakdown: Array<{
    label: string;
    count: number;
  }>;
};
