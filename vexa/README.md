# VEXA: Real-Time Service Marketplace (Mobile App)

VEXA is a real-time mobile marketplace application that connects **Customers** needing household or professional services with **Service Providers** who bid on these requests. The platform facilitates end-to-end service management, from job posting and live bidding to on-site modifications, payments, and ratings.

## 🚀 Features

### **1. Real-Time Bidding System**
- **Customers** post jobs with a budget, description, and location.
- **Providers** view available jobs in real-time and submit bids.
- Live updates powered by **Socket.io** ensure instant bid notifications.

### **2. Job Modifications (Revisions)**
- Providers can request scope/price modifications upon site inspection.
- Cryptographically verified requests allow customers to approve/reject seamlessly.

### **3. Customer & Provider Dashboards**
- **Customer:** Track all posted jobs, view live bids, manage payments, and rate providers.
- **Provider:** View available jobs, manage active assignments, and track total earnings.

### **4. Real-Time Notifications**
- In-app alerts for status updates (e.g., bid accepted, payment completed).
- Unread notification badges and live updates via WebSockets.

---

## 🛠 Tech Stack

**Frontend (Mobile App)**
- **Framework:** React Native CLI (TypeScript)
- **UI & Styling:** NativeWind (Tailwind CSS), Tamagui, Reanimated
- **State Management:** Zustand
- **Networking:** Axios, Socket.io-client

**Backend (API & DB)**
- **Framework:** Node.js, Express (TypeScript)
- **Database:** PostgreSQL with Prisma ORM
- **Real-Time:** Socket.io
- **Auth:** JWT authentication, bcryptjs

---

## 💻 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running
- React Native environment setup (Android Studio / Xcode)

### Setup & Installation

1. **Install Frontend Dependencies:**
```bash
cd vexa
npm install
```

2. **Install Backend Dependencies:**
```bash
cd vexa-backend
npm install
```

3. **Configure Environment Variables:**
Create `.env` file in the `vexa-backend` directory with your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/vexa_db"
JWT_SECRET="your_secret_key"
```

4. **Initialize Database:**
```bash
cd vexa-backend
npx prisma migrate dev
```

### Running the Application

1. **Start Backend Server:**
```bash
cd vexa-backend
npm run dev
```

2. **Start Frontend Metro Bundler:**
```bash
cd vexa
npx react-native start
```

3. **Run App on Emulator/Device:**
```bash
cd vexa
npm run android   # For Android
# or
npm run ios       # For iOS
```

---

*This application is currently in development.*
