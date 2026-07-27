export class BaseIdSet<T> {

  protected static readonly empty = null; // Symbol("empty");

  protected list: (T | typeof BaseIdSet.empty)[] = [];

  has(sid: number) {
    return sid >= 0 && sid < this.list.length && this.list[sid] !== BaseIdSet.empty;
  }

  get(sid: number) {
    if (!this.has(sid)) return undefined;
    return this.list[sid] as T;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (const item of this.list) {
      if (item === BaseIdSet.empty) continue;
      yield item;
    }
  }
}

export class IdSet<T> extends BaseIdSet<T> {

  private emptyStack: number[] = [];

  get length() {
    return this.list.length - this.emptyStack.length;
  }

  add(item: T) {
    if (this.emptyStack.length) {
      const sid = this.emptyStack.pop()!;
      this.list[sid] = item;
      return sid;
    }

    return this.list.push(item) - 1;
  }

  release(sid: number) {
    if (!this.has(sid)) return;
    this.list[sid] = BaseIdSet.empty;
    this.emptyStack.push(sid);
  }
}

export class SyncedIdSet<T> extends BaseIdSet<T> {
  
  set(sid: number, item: T) {
    if (sid >= this.list.length) {
      let fillStart = this.list.length;
      this.list.length = sid + 1;
      this.list.fill(BaseIdSet.empty, fillStart, sid);
    }
    this.list[sid] = item;
  }

  release(sid: number) {
    if (!this.has(sid)) return;
    this.list[sid] = BaseIdSet.empty;
  }
}
