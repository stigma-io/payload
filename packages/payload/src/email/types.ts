export type Message = {
  from: string
  html: string
  subject: string
  to: string
}

export type MockEmailHandler = { account: any; transport: any }
export type BuildEmailResult = Promise<
  | {
      fromAddress: string
      fromName: string
      transport: any
      transportOptions?: any
    }
  | MockEmailHandler
>
