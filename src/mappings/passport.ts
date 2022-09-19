import { store, BigInt, log } from "@graphprotocol/graph-ts";

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
  let roleId = passportId + "_" + hash;
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
  let id = passportAddress + "_" + memberAddress;
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
  let passport = Passport.load(event.address.toHexString()) as Passport;
  passport.baseUri = event.params.uri;
  passport.save();
}

export function handleMaxSupplyUpdated(event: MaxSupplyUpdated): void {
  let passport = Passport.load(event.address.toHex()) as Passport;
  passport.maxSupply = event.params.maxSupply;
  passport.save();
}

export function handlePassportInitialized(event: PassportInitialized): void {
  let registry = Registry.load(
    event.params.registryAddress.toHexString()
  ) as Registry;
  let passport = Passport.load(event.address.toHex()) as Passport;
  passport.name = event.params.name;
  passport.symbol = event.params.symbol;
  passport.transferEnabled = event.params.transferEnabled;
  passport.baseUri = registry.passportBaseUri;
  passport.maxSupply = event.params.maxSupply;
  passport.created = event.block.timestamp;

  passport.save();
}

export function handlePassportTransfer(event: Transfer): void {
  let from = event.params.from.toHexString();
  let to = event.params.to.toHexString();
  let tokenId = event.params.tokenId.toString();
  let passportAddress = event.address.toHexString();
  let passportMembershipId = getPassportMembershipId(passportAddress, tokenId);
  let passport = Passport.load(passportAddress) as Passport;
  let timestamp = event.block.timestamp;
  let passportMembership: PassportMembership;
  let toMember: Member;
  let fromMember: Member;
  let toPassportMember: PassportMember;
  let fromPassportMember: PassportMember;
  log.info('Handling Passport transfer:from- {} to- {}', [from, to])

  if (from == ZERO_ADDRESS_STRING) {
    toMember = getOrCreateMember(to, timestamp);
    log.info('Member created:{}', [toMember.id])

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
    if (from == "0x07468b3bc6dec3709c1260ffc5eb4065206c127c") {
      log.info('Transfer from 0x07468b3bc6dec3709c1260ffc5eb4065206c127c current count:{} -- membership count: {}', [fromMember.passportCount.toString(), fromPassportMember.membershipCount.toString()])
    }

    if (fromPassportMember.membershipCount > ZERO) {
      fromPassportMember.membershipCount = fromPassportMember.membershipCount.minus(
        ONE
      );
    }
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
  let passport = Passport.load(event.address.toHexString()) as Passport;
  passport.transferEnabled = event.params.transferable;
  passport.save();
}

export function handleUpgraded(event: Upgraded): void {
  let passport = Passport.load(event.address.toHex()) as Passport;
  passport.implementation = event.params.implementation;
  passport.save();
}

export function handleRoleGranted(event: RoleGranted): void {
  let passport = Passport.load(event.address.toHex()) as Passport;
  let role = getOrCreateRole(event.params.role.toHexString(), passport.id);

  let member = getOrCreateMember(
    event.params.account.toHex(),
    event.block.timestamp
  );

  let roleMemberId = getRoleMemberId(role.id, member.id);
  let roleMember = new PassportRoleMember(roleMemberId);
  roleMember.role = role.id;
  roleMember.member = member.id;
  roleMember.created = event.block.timestamp;
  roleMember.save();
}

export function handleRoleRevoked(event: RoleRevoked): void {
  let passport = Passport.load(event.address.toHex()) as Passport;

  let role = getOrCreateRole(
    event.params.role.toHexString(),
    event.address.toHex()
  );
  let member = getOrCreateMember(
    event.params.account.toHex(),
    event.block.timestamp
  );
  let roleMemberId = getRoleMemberId(role.id, member.id);
  store.remove("PassportRoleMember", roleMemberId);
}
