import { BigInt, Bytes, store } from "@graphprotocol/graph-ts";
import {
  PassportBaseUriUpdated,
  PassportCreated,
  PassportImplementationAdded,
  LoyaltyBaseUriUpdated,
  LoyaltyCreated,
  LoyaltyLedgerImplementationAdded,
  RoleGranted,
  RoleRevoked
} from "../../generated/PassageRegistry/PassageRegistry";

import {
  Registry,
  Passport,
  PassportImplementation,
  Loyalty,
  LoyaltyImplementation,
  RegistryRole,
  RegistryRoleMember
} from "../../generated/schema";

import {
  LoyaltyLedgerTemplate,
  PassportTemplate
} from "../../generated/templates";
import { getOrCreateMember, getRoleMemberId, ZERO } from "./common";

function getOrCreateRegistry(address: string, timestamp: BigInt): Registry {
  let registry = Registry.load(address);

  if (registry == null) {
    registry = new Registry(address);
    registry.latestPassportVersion = ZERO;
    registry.passportBaseUri = "";
    registry.passportCount = ZERO;
    registry.latestLoyaltyVersion = ZERO;
    registry.loyaltyBaseUri = "";
    registry.loyaltyCount = ZERO;
    registry.created = timestamp;
    registry.save();
  }

  return registry as Registry;
}

function getOrCreateRole(hash: string, registryId: string): RegistryRole {
  let role = RegistryRole.load(hash);

  if (role == null) {
    role = new RegistryRole(hash);
    role.registry = registryId;
    role.save();
  }

  return role as RegistryRole;
}

export function handlePassportBaseUriUpdated(
  event: PassportBaseUriUpdated
): void {
  const registry = getOrCreateRegistry(
    event.address.toHex(),
    event.block.timestamp
  );
  registry.passportBaseUri = event.params.uri;
  registry.save();
}

export function handlePassportCreated(event: PassportCreated): void {
  const registry = Registry.load(event.address.toHex()) as Registry;
  PassportTemplate.create(event.params.passportAddress);
  const passport = new Passport(event.params.passportAddress.toHex());
  passport.implementation = Bytes.empty();
  passport.name = "";
  passport.symbol = "";
  passport.transferEnabled = false;
  passport.baseUri = registry.passportBaseUri;
  passport.supply = ZERO;
  passport.maxSupply = ZERO;
  passport.created = ZERO;
  passport.memberCount = ZERO;

  passport.save();
}

export function handlePassportImplementationAdded(
  event: PassportImplementationAdded
): void {
  const version = event.params.version.toString();
  const implementation = new PassportImplementation(version);
  implementation.index = event.params.version;
  implementation.registry = event.address.toHexString();
  implementation.address = event.params.implementation;
  implementation.created = event.block.timestamp;

  implementation.save();
}

export function handleLoyaltyBaseUriUpdated(
  event: LoyaltyBaseUriUpdated
): void {
  const registry = getOrCreateRegistry(
    event.address.toHex(),
    event.block.timestamp
  );
  registry.loyaltyBaseUri = event.params.uri;
  registry.save();
}

export function handleLoyaltyCreated(event: LoyaltyCreated): void {
  const registry = Registry.load(event.address.toHex()) as Registry;
  LoyaltyLedgerTemplate.create(event.params.loyaltyAddress);
  const loyalty = new Loyalty(event.params.loyaltyAddress.toHex());
  loyalty.implementation = Bytes.empty();
  loyalty.baseUri = registry.loyaltyBaseUri;
  loyalty.created = event.block.timestamp;

  loyalty.save();
}

export function handleLoyaltyLedgerImplementationAdded(
  event: LoyaltyLedgerImplementationAdded
): void {
  const version = event.params.version.toString();
  const implementation = new LoyaltyImplementation(version);
  implementation.index = event.params.version;
  implementation.registry = event.address.toHexString();
  implementation.address = event.params.implementation;
  implementation.created = event.block.timestamp;

  implementation.save();
}

export function handleRoleGranted(event: RoleGranted): void {
  const registry = getOrCreateRegistry(
    event.address.toHex(),
    event.block.timestamp
  );

  const role = getOrCreateRole(event.params.role.toHexString(), registry.id);

  const member = getOrCreateMember(
    event.params.account.toHex(),
    event.block.timestamp
  );

  const roleMemberId = getRoleMemberId(role.id, member.id);
  const roleMember = new RegistryRoleMember(roleMemberId);
  roleMember.role = role.id;
  roleMember.member = member.id;
  roleMember.created = event.block.timestamp;
  roleMember.save();
}

export function handleRoleRevoked(event: RoleRevoked): void {
  const registry = Registry.load(event.address.toHex()) as Registry;
  const role = getOrCreateRole(
    event.params.role.toHexString(),
    event.address.toHex()
  );
  const member = getOrCreateMember(
    event.params.account.toHex(),
    event.block.timestamp
  );
  const roleMemberId = getRoleMemberId(role.id, member.id);
  store.remove("RegistryRoleMember", roleMemberId);
}
