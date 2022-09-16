import { BigInt } from "@graphprotocol/graph-ts";

import { Member } from "../../generated/schema";

export const ZERO = BigInt.fromI32(0);
export const ONE = BigInt.fromI32(1);
export const ZERO_ADDRESS_STRING = "0x0000000000000000000000000000000000000000";

export function getOrCreateMember(address: string, timestamp: BigInt): Member {
  let member = Member.load(address);

  if (member == null) {
    member = new Member(address);
    member.passportCount = ZERO;
    member.created = timestamp;

    member.save();
  }

  return member;
}

export function getRoleMemberId(roleId: string, memberId: string): string {
  return roleId + "_" + memberId;
}
