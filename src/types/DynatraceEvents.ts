interface DynatraceEvents {
  nextEventStartTms: number;
  nextEventId: number;
  nextCursor: string;
  from: number;
  to: number;
  totalEventCount: number;
  events: DynatraceEvent[];
}

interface DynatraceEvent {
  eventId: number;
  startTime: number;
  endTime: number;
  entityId: string;
  entityName: string;
  impactLevel: string;
  eventType: string;
  eventStatus: string;
  tags: Tag[];
  id: string;
  customProperties: CustomProperties;
  annotationDescription: string;
  source: string;
}

interface CustomProperties {
  RemediationProvider: string;
  Comment: string;
  Approver: string;
  RemediationAction?: string;
}

interface Tag {
  context: string;
  key: string;
  value: string;
}
