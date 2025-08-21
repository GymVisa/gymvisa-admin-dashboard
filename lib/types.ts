export interface Gym {
  gymID: string
  name: string
  address: string
  city: string
  country: string
  description: string
  email: string
  phoneNo: string
  imageUrl1: string
  imageUrl2: string
  googleMapsLink: string
  creditsPerVisit: number
  qrCodeUrl: string
  subscription: string
  operatingHours?: {
    unified: boolean
    male: {
      [key: string]: {
        open: string
        close: string
        closed: boolean
      }
    }
    female: {
      [key: string]: {
        open: string
        close: string
        closed: boolean
      }
    }
  }
}

export interface User {
  UserID: string
  Name: string
  Email: string
  PhoneNo: string
  Gender: string
  Subscription: string
  SubscriptionStartDate: any
  SubscriptionEndDate: any
  FCMToken: string
  isUserFreezed?: boolean
  Organization?: string
  credits?: number
}

export interface QRScan {
  QRID: string
  UserID: string
  gymName: string
  gymAddress: string
  gymSubscription: string
  Time: string
}

export interface Subscription {
  SubscriptionID: string
  name: string
  price: string
  SubscriptionDays: string
}

export interface Transaction {
  transactionId: string
  UserId: string
  Amount: number
  OrderId: string
  Status: string
  Subscription: string
  UpdatedAt: any
}
