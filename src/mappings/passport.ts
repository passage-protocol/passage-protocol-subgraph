import { store, BigInt } from "@graphprotocol/graph-ts";

import {
  PassportInitialized,
  Transfer,
  TransferEnableUpdated,
  BaseUriUpdated,
  MaxSupplyUpdated,
  RoleGranted,
  RoleRevoked,
  Upgraded
} from "../../generated/templates/PassportTemplate/Passport";

import {
  Member,
  Passport,
  PassportMember,
  PassportMembership,
  PassportRole,
  PassportRoleMember,
  Registry
} from "../../generated/schema";

import {
  ZERO_ADDRESS_STRING,
  getOrCreateMember,
  getRoleMemberId,
  ONE,
  ZERO
} from "./common";

function getOrCreateRole(hash: string, passportId: string): PassportRole {
  const roleId = passportId + "_" + hash;
  let role = PassportRole.load(roleId);

  if (role == null) {
    role = new PassportRole(roleId);
    role.passport = passportId;
    role.roleHash = hash;
    role.save();
  }

  return role as PassportRole;
}

export function getOrCreatePassportMember(
  passportAddress: string,
  memberAddress: string,
  timestamp: BigInt
): PassportMember {
  const id = passportAddress + "_" + memberAddress;
  let passportMember = PassportMember.load(id);

  if (passportMember == null) {
    passportMember = new PassportMember(id);
    passportMember.passport = passportAddress;
    passportMember.member = memberAddress;
    passportMember.membershipCount = ZERO;
    passportMember.created = timestamp;

    passportMember.save();
  }

  return passportMember as PassportMember;
}

function getPassportMembershipId(
  passportAddress: string,
  tokenId: string
): string {
  return passportAddress + "_" + tokenId;
}

export function handleBaseUriUpdated(event: BaseUriUpdated): void {
  const passport = Passport.load(event.address.toHexString()) as Passport;
  passport.baseUri = event.params.uri;
  passport.save();
}

export function handleMaxSupplyUpdated(event: MaxSupplyUpdated): void {
  const passport = Passport.load(event.address.toHex()) as Passport;
  passport.maxSupply = event.params.maxSupply;
  passport.save();
}

export function handlePassportInitialized(event: PassportInitialized): void {
  const registry = Registry.load(
    event.params.registryAddress.toHexString()
  ) as Registry;
  const passport = Passport.load(event.address.toHex()) as Passport;
  passport.name = event.params.name;
  passport.symbol = event.params.symbol;
  passport.transferEnabled = event.params.transferEnabled;
  passport.baseUri = registry.passportBaseUri;
  passport.maxSupply = event.params.maxSupply;
  passport.created = event.block.timestamp;

  passport.save();
}

export function handlePassportTransfer(event: Transfer): void {
  const from = event.params.from.toHexString();
  const to = event.params.to.toHexString();
  const tokenId = event.params.tokenId.toString();
  const passportAddress = event.address.toHexString();
  const passportMembershipId = getPassportMembershipId(
    passportAddress,
    tokenId
  );
  const passport = Passport.load(passportAddress) as Passport;
  const timestamp = event.block.timestamp;
  let passportMembership: PassportMembership;
  let toMember: Member;
  let fromMember: Member;
  let toPassportMember: PassportMember;
  let fromPassportMember: PassportMember;

  if (from == ZERO_ADDRESS_STRING) {
    toMember = getOrCreateMember(to, timestamp);
    toPassportMember = getOrCreatePassportMember(
      passportAddress,
      to,
      timestamp
    );
    passportMembership = new PassportMembership(passportMembershipId);
    passportMembership.tokenId = event.params.tokenId;
    passportMembership.passport = passport.id;
    passportMembership.member = toMember.id;
    passportMembership.created = timestamp;
    passportMembership.lastTransferred = timestamp;
    passportMembership.save();

    toPassportMember.membershipCount = toPassportMember.membershipCount.plus(
      ONE
    );
    toPassportMember.save();

    // if this is the members first passport in the collection increase member count by 1
    // and increase the member's passport count by 1
    if (toPassportMember.membershipCount == ONE) {
      passport.memberCount = passport.memberCount.plus(ONE);
      toMember.passportCount = toMember.passportCount.plus(ONE);
      toMember.save();
    }
    passport.supply = passport.supply.plus(ONE);
    passport.save();
  } else if (to == ZERO_ADDRESS_STRING) {
    store.remove("PassportMembership", passportAddress + "_" + tokenId);
    fromMember = Member.load(from) as Member;
    fromPassportMember = PassportMember.load(
      passportAddress + "_" + from
    ) as PassportMember;
    fromPassportMember.membershipCount = fromPassportMember.membershipCount.minus(
      ONE
    );
    fromPassportMember.save();

    // if the sending member has 0 passports decrease passport member count by 1
    // and decrease member passport count by 1
    if (fromPassportMember.membershipCount == ZERO) {
      passport.memberCount = passport.memberCount.minus(ONE);
      fromMember.passportCount = fromMember.passportCount.minus(ONE);
      fromMember.save();
    }
    passport.supply = passport.supply.minus(ONE);
    passport.save();
  } else {
    fromMember = Member.load(from) as Member;
    toMember = getOrCreateMember(to, timestamp);
    fromPassportMember = getOrCreatePassportMember(
      passportAddress,
      from,
      timestamp
    );
    toPassportMember = getOrCreatePassportMember(
      passportAddress,
      to,
      timestamp
    );
    passportMembership = PassportMembership.load(
      passportMembershipId
    ) as PassportMembership;

    passportMembership.member = toMember.id;
    passportMembership.lastTransferred = timestamp;
    passportMembership.save();

    fromPassportMember.membershipCount = fromPassportMember.membershipCount.minus(
      ONE
    );
    fromPassportMember.save();

    toPassportMember.membershipCount = toPassportMember.membershipCount.plus(
      ONE
    );
    toPassportMember.save();

    // if the sending member has 0 passports decrease passport member count by 1
    // and decrease member passport count by 1
    if (fromPassportMember.membershipCount == ZERO) {
      fromMember.passportCount = fromMember.passportCount.minus(ONE);
      fromMember.save();
      passport.memberCount = passport.memberCount.minus(ONE);
    }

    // if this is the receiving member's first passport in the collection increase member count by 1
    // and increase the member's passport count by 1
    if (toPassportMember.membershipCount == ONE) {
      toMember.passportCount = toMember.passportCount.plus(ONE);
      toMember.save();
      passport.memberCount = passport.memberCount.plus(ONE);
    }
    passport.save();
  }
}

export function handlePassportTransferEnabled(
  event: TransferEnableUpdated
): void {
  const passport = Passport.load(event.address.toHexString()) as Passport;
  passport.transferEnabled = event.params.transferable;
  passport.save();
}

export function handleUpgraded(event: Upgraded): void {
  const passport = Passport.load(event.address.toHex()) as Passport;
  passport.implementation = event.params.implementation;
  passport.save();
}

export function handleRoleGranted(event: RoleGranted): void {
  const passport = Passport.load(event.address.toHex()) as Passport;
  const role = getOrCreateRole(event.params.role.toHexString(), passport.id);

  const member = getOrCreateMember(
    event.params.account.toHex(),
    event.block.timestamp
  );

  const roleMemberId = getRoleMemberId(role.id, member.id);
  const roleMember = new PassportRoleMember(roleMemberId);
  roleMember.role = role.id;
  roleMember.member = member.id;
  roleMember.created = event.block.timestamp;
  roleMember.save();
}

export function handleRoleRevoked(event: RoleRevoked): void {
  const passport = Passport.load(event.address.toHex()) as Passport;

  const role = getOrCreateRole(
    event.params.role.toHexString(),
    event.address.toHex()
  );
  const member = getOrCreateMember(
    event.params.account.toHex(),
    event.block.timestamp
  );
  const roleMemberId = getRoleMemberId(role.id, member.id);
  store.remove("PassportRoleMember", roleMemberId);
}
