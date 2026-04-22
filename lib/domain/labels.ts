import type {
  OrchardMembershipRole,
  OrchardMembershipStatus,
  OrchardStatus,
  PlotStatus,
  TreeConditionStatus,
} from "@/types/contracts";

const orchardRoleLabels: Record<OrchardMembershipRole, string> = {
  owner: "Wlasciciel",
  worker: "Pracownik",
  manager: "Manager",
  viewer: "Podglad",
};

const orchardMembershipStatusLabels: Record<OrchardMembershipStatus, string> = {
  active: "Aktywny",
  invited: "Zaproszony",
  revoked: "Odwolany",
};

const orchardStatusLabels: Record<OrchardStatus, string> = {
  active: "Aktywny",
  archived: "Zarchiwizowany",
};

const plotStatusLabels: Record<PlotStatus, string> = {
  active: "Aktywna",
  planned: "Planowana",
  archived: "Zarchiwizowana",
};

const treeConditionLabels: Record<TreeConditionStatus, string> = {
  new: "Nowe",
  good: "Dobre",
  warning: "Uwaga",
  critical: "Krytyczne",
  removed: "Usuniete",
};

export function getOrchardRoleLabel(role: OrchardMembershipRole) {
  return orchardRoleLabels[role];
}

export function getOrchardMembershipStatusLabel(status: OrchardMembershipStatus) {
  return orchardMembershipStatusLabels[status];
}

export function getOrchardStatusLabel(status: OrchardStatus) {
  return orchardStatusLabels[status];
}

export function getPlotStatusLabel(status: PlotStatus) {
  return plotStatusLabels[status];
}

export function getTreeConditionLabel(condition: TreeConditionStatus) {
  return treeConditionLabels[condition];
}
