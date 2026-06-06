# PyData London 2026 UI

A modern chat interface built with Next.js 16, React 19, and TypeScript that provides streaming responses from a FastAPI backend. Features role-based conversations (User/Analyst) with real-time token-by-token streaming.

## Features

- 🚀 **Real-time Streaming**: Token-by-token response streaming for immediate feedback
- 👥 **Role-Based Chat**: Switch between User and Analyst modes for different conversation contexts
- 🎨 **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- ⚡ **Edge Runtime**: Optimized for performance with Next.js Edge Runtime
- 🔄 **Dual Endpoints**: Support for both semantic and DDL chat endpoints

## Prerequisites

- **Node.js**: v18.17 or higher
- **npm**: v9 or higher (comes with Node.js)
- **FastAPI Backend**: A running FastAPI server (see https://github.com/hikarilabs/pydata-london-2026-sql.git)

## Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repository-url>
   cd pydata-london-2026-ui
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env.local` file in the project root (see Environment Variables section below)

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a `.env.local` file in the root directory with the following configuration:

```env
# FastAPI Backend URL
# This is the base URL of your FastAPI backend server
# Default: http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```