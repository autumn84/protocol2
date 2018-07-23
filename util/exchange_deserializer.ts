import { BigNumber } from "bignumber.js";
import { Bitstream } from "./bitstream";
import { EncodeSpec } from "./encode_spec";
import { Mining } from "./mining";
import { MiningSpec } from "./mining_spec";
import { OrderUtil } from "./order";
import { OrderSpec } from "./order_spec";
import { ParticipationSpec } from "./participation_spec";
import { Ring } from "./ring";
import { OrderInfo, RingMinedEvent, RingsInfo, SimulatorReport, TransferItem } from "./types";

export class ExchangeDeserializer {

  private data: string;

  private addressList?: string[];
  private uintList?: BigNumber[];
  private bytesList?: string[];

  private addressListIdx: number = 0;
  private uintListIdx: number = 0;
  private bytesListIdx: number = 0;

  constructor() {
    // empty
  }

  public deserialize(data: string, transactionOrigin: string): [Mining, OrderInfo[], Ring[]] {

    const bitstream = new Bitstream(data);

    const encodeSpecsLen = bitstream.extractUint16(0);
    let offset = 2;
    const encodeSpecs = new EncodeSpec(bitstream.copyToUint16Array(offset, encodeSpecsLen));
    offset += 2 * encodeSpecsLen;

    const miningSpec = new MiningSpec(bitstream.extractUint16(offset));
    offset += 2;
    const orderSpecs = bitstream.copyToUint16Array(offset, encodeSpecs.orderSpecSize());
    offset += 2 * encodeSpecs.orderSpecSize();

    const ringSpecs = bitstream.copyToUint8ArrayList(offset, encodeSpecs.ringSpecSizeArray());
    offset += 1 * encodeSpecs.ringSpecsDataLen();

    this.addressList = bitstream.copyToAddressArray(offset, encodeSpecs.addressListSize());
    offset += 20 * encodeSpecs.addressListSize();
    // console.log("addressList: " + this.addressList);

    this.uintList = bitstream.copyToUintArray(offset, encodeSpecs.uintListSize());
    offset += 32 * encodeSpecs.uintListSize();
    // console.log("uintList: " + this.uintList);

    this.bytesList = bitstream.copyToBytesArray(offset, encodeSpecs.bytesListSizeArray());
    // console.log("bytesList: " + this.bytesList);

    const mining = new Mining(
      (miningSpec.hasFeeRecipient() ? this.nextAddress() : transactionOrigin),
      (miningSpec.hasMiner() ? this.nextAddress() : undefined),
      (miningSpec.hasSignature() ? this.nextBytes() : undefined),
    );
    // console.log(mining);

    const orders = this.assembleOrders(orderSpecs);
    // orders.forEach((o) => console.log(o));
    const rings = this.assembleRings(ringSpecs, orders);
    // rings.forEach((o) => console.log(o));

    return [mining, orders, rings];
  }

  private assembleOrders(specs: number[]) {
    const size = specs.length;
    const orders: OrderInfo[] = [];
    for (let i = 0; i < size; i++) {
      orders.push(this.assembleOrder(specs[i]));
    }
    return orders;
  }

  private assembleOrder(specData: number) {
    const MAX_UINT = new BigNumber("f".repeat(64), 16);
    const spec = new OrderSpec(specData);
    const order: OrderInfo = {
      owner: this.nextAddress(),
      tokenS: this.nextAddress(),
      tokenB: null,
      amountS: this.nextUint().toNumber(),
      amountB: this.nextUint().toNumber(),
      lrcFee: this.nextUint().toNumber(),
      dualAuthAddr: spec.hasDualAuth() ? this.nextAddress() : undefined,
      broker: spec.hasBroker() ? this.nextAddress() : undefined,
      orderInterceptor: spec.hasOrderInterceptor() ? this.nextAddress() : undefined,
      walletAddr: spec.hasWallet() ? this.nextAddress() : undefined,
      validSince: spec.hasValidSince() ? this.nextUint().toNumber() : 0,
      // TODO: validUntil needs to be BigNumber to store MAX_UINT, but is now just number
      validUntil: spec.hasValidUntil() ? this.nextUint().toNumber() : /*MAX_UINT.toNumber()*/undefined,
      sig: spec.hasSignature() ? this.nextBytes() : undefined,
      dualAuthSig: spec.hasDualAuthSig() ? this.nextBytes() : undefined,
      allOrNone: spec.allOrNone(),
    };
    return order;
  }

  private assembleRings(specs: number[][], orders: OrderInfo[]) {
    const size = specs.length;
    const rings: Ring[] = [];
    for (let i = 0; i < size; i++) {
      rings.push(this.assembleRing(specs[i], orders));
    }
    return rings;
  }

  private assembleRing(pspecs: number[], orders: OrderInfo[]) {
    const size = pspecs.length;
    assert(size > 1 && size <= 8, "bad ring size");

    // TODO: create participation struct like in Solidity
    const ringOrders: OrderInfo[] = [];
    let prevTokenS: string;
    for (let i = 0; i < size; i++) {
      const pspec = new ParticipationSpec(pspecs[i]);
      const order = orders[pspec.orderIndex()];

      order.tokenB = prevTokenS;
      prevTokenS = order.tokenS;
      ringOrders.push(order);
    }
    ringOrders[0].tokenB = prevTokenS;
    const ring = new Ring(ringOrders, undefined, undefined);
    return ring;
  }

  private nextAddress() {
    return this.addressList[this.addressListIdx++];
  }

  private nextUint() {
    return this.uintList[this.uintListIdx++];
  }

  private nextBytes() {
    return this.bytesList[this.bytesListIdx++];
  }

}