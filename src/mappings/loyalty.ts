import { BigInt, store } from "@graphprotocol/graph-ts";

import {
  Loyalty,
  LoyaltyRole,
  LoyaltyRoleMember,
  LoyaltyToken,
  LoyaltyTokenOwner,
  Member
} from "../../generated/schema";

import {
  BaseUriUpdated,
  MaxSupplyUpdated,
  RoleGranted,
  RoleRevoked,
  TokenCreated,
  TransferBatch,
  TransferEnableUpdated,
  TransferSingle,
  Upgraded
} from "../../generated/templates/LoyaltyLedgerTemplate/LoyaltyLedger";
import {
  getOrCreateMember,
  getRoleMemberId,
  ZERO,
  ZERO_ADDRESS_STRING
} from "./common";

function getLoyaltyTokenId(loyaltyId: string, tokenIdx: string): string {
  return loyaltyId + "_" + tokenIdx;
}

function getLoyaltyTokenOwnerId(
  loyaltyTokenId: string,
  memberId: string
): string {
  return loyaltyTokenId + "_" + memberId;
}

function getOrCreateRole(hash: string, loyaltyId: string): LoyaltyRole {
  const roleId = loyaltyId + "_" + hash;

  let role = LoyaltyRole.load(roleId);

  if (role == null) {
    role = new LoyaltyRole(roleId);
    role.loyalty = loyaltyId;
    role.roleHash = hash;
    role.save();
  }

  return role as LoyaltyRole;
}

function getOrCreateLoyaltyTokenOwner(
  loyaltyTokenId: string,
  memberId: string,
  timestamp: BigInt
): LoyaltyTokenOwner {
  const loyaltyTokenOwnerId = getLoyaltyTokenOwnerId(loyaltyTokenId, memberId);
  let loyaltyTokenOwner = LoyaltyTokenOwner.load(loyaltyTokenOwnerId);
  if (loyaltyTokenOwner == null) {
    loyaltyTokenOwner = new LoyaltyTokenOwner(loyaltyTokenOwnerId);
    loyaltyTokenOwner.amount = ZERO;
    loyaltyTokenOwner.member = memberId;
    loyaltyTokenOwner.loyaltyToken = loyaltyTokenId;
    loyaltyTokenOwner.created = timestamp;

    loyaltyTokenOwner.save();
  }

  return loyaltyTokenOwner;
}

export function handleBaseUriUpdated(event: BaseUriUpdated): void {
  const loyalty = Loyalty.load(event.address.toHex()) as Loyalty;
  loyalty.baseUri = event.params.uri;
  loyalty.save();
}
export function handleTokenCreated(event: TokenCreated): void {
  const loyalty = Loyalty.load(event.address.toHex()) as Loyalty;
  const loyaltyTokenId = getLoyaltyTokenId(
    loyalty.id,
    event.params.id.toString()
  );
  const loyaltyToken = new LoyaltyToken(loyaltyTokenId);
  loyaltyToken.tokenIdx = event.params.id;
  loyaltyToken.name = event.params.name;
  loyaltyToken.supply = ZERO;
  loyaltyToken.maxSupply = event.params.maxSupply;
  loyaltyToken.transferEnabled = event.params.transferEnabled;
  loyaltyToken.loyalty = loyalty.id;
  loyaltyToken.created = event.block.timestamp;

  loyaltyToken.save();
}

export function handleTransferEnabledUpdated(
  event: TransferEnableUpdated
): void {
  const loyaltyTokenId = getLoyaltyTokenId(
    event.address.toHex(),
    event.params.id.toString()
  );
  const loyaltyToken = LoyaltyToken.load(loyaltyTokenId) as LoyaltyToken;
  loyaltyToken.transferEnabled = event.params.transferable;

  loyaltyToken.save();
}

export function handleMaxSupplyUpdated(event: MaxSupplyUpdated): void {
  const loyaltyTokenId = getLoyaltyTokenId(
    event.address.toHex(),
    event.params.id.toString()
  );
  const loyaltyToken = LoyaltyToken.load(loyaltyTokenId) as LoyaltyToken;
  loyaltyToken.maxSupply = event.params.maxSupply;

  loyaltyToken.save();
}

function processTransfer(
  from: string,
  to: string,
  value: BigInt,
  loyaltyTokenId: string,
  timestamp: BigInt
): void {
  const loyaltyToken = LoyaltyToken.load(loyaltyTokenId) as LoyaltyToken;
  let toMember: Member | null;
  let toHolder: LoyaltyTokenOwner | null;
  let fromHolder: LoyaltyTokenOwner | null;
  if (from == ZERO_ADDRESS_STRING) {
    // get or create to member to ensure member exists
    toMember = getOrCreateMember(to, timestamp);
    toHolder = getOrCreateLoyaltyTokenOwner(
      loyaltyTokenId,
      toMember.id,
      timestamp
    );
    toHolder.amount = toHolder.amount.plus(value);
    toHolder.save();

    loyaltyToken.supply = loyaltyToken.supply.plus(value);
    loyaltyToken.save();
  } else if (to == ZERO_ADDRESS_STRING) {
    fromHolder = getOrCreateLoyaltyTokenOwner(loyaltyTokenId, from, timestamp);
    fromHolder.amount = fromHolder.amount.minus(value);
    fromHolder.save();

    loyaltyToken.supply = loyaltyToken.supply.minus(value);
    loyaltyToken.save();
  } else {
    // get or create to member to ensure member exists
    toMember = getOrCreateMember(to, timestamp);
    toHolder = getOrCreateLoyaltyTokenOwner(
      loyaltyTokenId,
      toMember.id,
      timestamp
    );
    toHolder.amount = toHolder.amount.plus(value);
    toHolder.save();

    fromHolder = getOrCreateLoyaltyTokenOwner(loyaltyTokenId, from, timestamp);
    fromHolder.amount = fromHolder.amount.minus(value);
    fromHolder.save();
  }
}

export function handleTransferBatch(event: TransferBatch): void {
  const from = event.params.from.toHex();
  const to = event.params.to.toHex();
  const ids = event.params.ids;
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const loyaltyTokenId = getLoyaltyTokenId(
      event.address.toHex(),
      id.toString()
    );
    const value = event.params.values[i];
    processTransfer(from, to, value, loyaltyTokenId, event.block.timestamp);
  }
}

export function handleTransferSingle(event: TransferSingle): void {
  const loyaltyTokenId = getLoyaltyTokenId(
    event.address.toHex(),
    event.params.id.toString()
  );
  processTransfer(
    event.params.from.toHex(),
    event.params.to.toHex(),
    event.params.value,
    loyaltyTokenId,
    event.block.timestamp
  );
}

export function handleUpgraded(event: Upgraded): void {
  const loyalty = Loyalty.load(event.address.toHex()) as Loyalty;
  loyalty.implementation = event.params.implementation;
  loyalty.save();
}

export function handleRoleGranted(event: RoleGranted): void {
  const loyalty = Loyalty.load(event.address.toHex()) as Loyalty;

  const role = getOrCreateRole(event.params.role.toHexString(), loyalty.id);

  const member = getOrCreateMember(
    event.params.account.toHex(),
    event.block.timestamp
  );

  const roleMemberId = getRoleMemberId(role.id, member.id);
  const roleMember = new LoyaltyRoleMember(roleMemberId);
  roleMember.role = role.id;
  roleMember.member = member.id;
  roleMember.created = event.block.timestamp;
  roleMember.save();
}

export function handleRoleRevoked(event: RoleRevoked): void {
  const loyalty = Loyalty.load(event.address.toHex()) as Loyalty;

  const role = getOrCreateRole(
    event.params.role.toHexString(),
    event.address.toHex()
  );
  const member = getOrCreateMember(
    event.params.account.toHex(),
    event.block.timestamp
  );
  const roleMemberId = getRoleMemberId(role.id, member.id);
  store.remove("LoyaltyRoleMember", roleMemberId);
}
