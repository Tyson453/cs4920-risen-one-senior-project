import * as uuid from 'uuid'

export interface SessionToken {
  id: string,
  requested: number,
  expires?: number,
  started: number,
  ended?: number,
}

export function isSessionToken(session: any): session is SessionToken {
  return 'id' in session && 'requested' in session && 'started' in session
}

export class Session implements SessionToken {
  id: string
  requested: number
  expires?: number
  started: number
  ended?: number

  constructor(sessionToken: Partial<SessionToken>)
  constructor(requested?: number, expires?: number, started?: number, ended?: number)
  constructor(
    sessOrReq?: Partial<SessionToken> | number,
    expires?: number,
    started?: number,
    ended?: number,
  ) {
    if (typeof sessOrReq === 'number') {
      this.id = uuid.v4()
      this.requested = sessOrReq
      this.expires = expires
      this.started = started || this.requested
      this.ended = ended
    } else {
      this.id = sessOrReq?.id || uuid.v4()
      this.requested = sessOrReq?.requested || this.timestamp()
      this.expires = sessOrReq?.expires
      this.started = sessOrReq?.started || this.requested
      this.ended = sessOrReq?.ended
    }
  }

  get isExpired(): boolean {
    return this.expires !== undefined && this.expires < this.timestamp()
  }

  get isEnded(): boolean {
    return this.isExpired || (this.ended !== undefined && this.ended <= this.timestamp())
  }

  close(endtime?: number): void {
    const now = endtime || this.timestamp()
    if (this.ended === undefined || this.ended > now) {
      this.ended = now
    }
    if (!this.isExpired) {
      this.expire(now)
    }
  }

  expire(expire?: number): void {
    const now = expire || this.timestamp()
    if (this.expires === undefined || this.expires > now) {
      this.expires = now
    }
  }

  private timestamp(): number {
    return Math.floor(Date.now() / 1000)
  }
}
