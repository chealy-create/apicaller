export interface ParamDef {
  key: string;
  label: string;
  default: string;
  type?: "entry" | "combo" | "searchable_ratio" | "searchable_exchange";
  options?: string[];
}

export interface ApiCallDef {
  id: string;
  name: string;
  desc: string;
  params: ParamDef[];
}

export interface PlatformDef {
  name: string;
  calls: ApiCallDef[];
}

export interface Tab {
  id: string;
  label: string;
  data: unknown;
  platform: string;
  callName: string;
  callId: string;
  params: Record<string, string>;
  loading?: boolean;
  error?: string;
  httpStatus?: number;
}

export interface FetchRequest {
  platformId: string;
  callId: string;
  params: Record<string, string>;
}
