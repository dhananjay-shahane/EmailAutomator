# Email-to-LAS Processing Automation System - Local Setup Guide

This guide provides step-by-step instructions for setting up the Email-to-LAS Processing Automation System on your local PC.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### 1. Node.js and npm
- **Download**: Visit [nodejs.org](https://nodejs.org/)
- **Version Required**: Node.js 18.x or higher
- **Installation**: Download the LTS version and follow the installer instructions
- **Verify Installation**:
  ```bash
  node --version
  npm --version
  ```

### 2. Python (for MCP resources and scripts)
- **Download**: Visit [python.org](https://python.org/)
- **Version Required**: Python 3.8 or higher
- **Installation**: Download and install, ensure "Add Python to PATH" is checked
- **Verify Installation**:
  ```bash
  python --version
  # or
  python3 --version
  ```

### 3. Git
- **Download**: Visit [git-scm.com](https://git-scm.com/)
- **Installation**: Follow the installer instructions for your operating system
- **Verify Installation**:
  ```bash
  git --version
  ```

### 4. PostgreSQL Database
- **Option 1 - Local PostgreSQL**:
  - Download from [postgresql.org](https://www.postgresql.org/download/)
  - Install and remember your username/password
  - Create a database named `email_las_system`

- **Option 2 - Cloud Database (Recommended)**:
  - Use [Neon Database](https://neon.tech/) (free tier available)
  - Or [Supabase](https://supabase.com/) (free tier available)
  - Or [Railway](https://railway.app/) PostgreSQL

## Project Setup Instructions

### Step 1: Clone the Repository
```bash
git clone <your-repository-url>
cd <project-directory>
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```

This will install all the required dependencies including:
- Express.js (backend framework)
- React + Vite (frontend)
- Drizzle ORM (database)
- TypeScript
- Tailwind CSS
- And many other packages listed in package.json

### Step 3: Install Python Dependencies
```bash
# Navigate to the project root if not already there
cd <project-directory>

# Install Python dependencies
pip install -r requirements.txt
```

If `requirements.txt` doesn't exist, install these packages manually:
```bash
pip install pandas numpy matplotlib lasio
```

### Step 4: Database Setup

#### Configure Database Connection
1. Create a `.env` file in the project root:
```bash
touch .env
```

2. Add your database connection details to `.env`:
```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/email_las_system"

# If using Neon Database, your URL will look like:
# DATABASE_URL="postgresql://username:password@ep-xyz.us-east-1.aws.neon.tech/email_las_system?sslmode=require"

# Email Configuration (optional for initial setup)
IMAP_HOST="imap.gmail.com"
IMAP_PORT=993
IMAP_USER="your-email@gmail.com"
IMAP_PASSWORD="your-app-password"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"

# LLM Configuration (optional)
LLM_ENDPOINT="http://localhost:11434"
LLM_MODEL="llama3.2:1b"

# Session Secret
SESSION_SECRET="your-secret-key-here"
```

#### Initialize Database Schema
```bash
npm run db:push
```

This command will create all the necessary tables in your database.

### Step 5: Email Configuration (Optional)

If you want to enable email processing features:

#### For Gmail:
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Use this app password in your `.env` file

#### For Other Email Providers:
- Update the IMAP/SMTP settings in `.env` according to your provider's documentation

### Step 6: LLM Setup (Optional)

For AI-powered email processing:

#### Option 1: Ollama (Local)
```bash
# Install Ollama from https://ollama.com/
# Then pull the required model
ollama pull llama3.2:1b
```

#### Option 2: OpenAI API
Update your `.env` file:
```env
LLM_ENDPOINT="https://api.openai.com/v1"
LLM_MODEL="gpt-3.5-turbo"
OPENAI_API_KEY="your-openai-api-key"
```

### Step 7: Start the Development Server
```bash
npm run dev
```

This command will:
- Start the Express.js backend server
- Start the Vite development server for the React frontend
- Enable hot module replacement for development

The application will be available at: `http://localhost:5000`

## Verification Steps

### 1. Check Frontend
- Open `http://localhost:5000` in your browser
- You should see the dashboard with system status indicators
- Verify that the navigation works (Dashboard, Settings pages)

### 2. Check Backend API
- Open `http://localhost:5000/api/dashboard` in your browser
- You should see JSON data with system status

### 3. Check Database Connection
- The dashboard should show database connection status
- If there are errors, check your DATABASE_URL in `.env`

### 4. Check Email Integration (if configured)
- Navigate to Settings page
- Configure email credentials
- Test email connection

## Production Build

To build for production:

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## File Structure Overview

```
project-root/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utility functions
│   │   └── hooks/         # Custom React hooks
│   └── index.html
├── server/                 # Express backend
│   ├── services/          # Business logic services
│   ├── routes.ts          # API routes
│   ├── index.ts           # Server entry point
│   └── vite.ts            # Vite integration
├── shared/                 # Shared TypeScript types
├── mcp_resources/          # Python scripts and LAS files
│   ├── scripts/           # Data processing scripts
│   └── las_files/         # Sample LAS files
├── package.json           # Node.js dependencies
├── pyproject.toml         # Python project configuration
├── vite.config.ts         # Vite configuration
├── drizzle.config.ts      # Database configuration
└── .env                   # Environment variables (create this)
```

## Common Issues and Solutions

### Issue: "Cannot connect to database"
- **Solution**: Check your DATABASE_URL in `.env` file
- Ensure PostgreSQL is running (if using local database)
- Verify database credentials

### Issue: "Module not found" errors
- **Solution**: Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then run `npm install`

### Issue: Python scripts not working
- **Solution**: Ensure Python dependencies are installed: `pip install pandas numpy matplotlib lasio`
- Check Python path in your system

### Issue: Email features not working
- **Solution**: Verify email credentials in `.env`
- For Gmail, ensure you're using an App Password, not your regular password
- Check IMAP/SMTP settings for your email provider

### Issue: Port 5000 already in use
- **Solution**: Kill the process using port 5000 or change the port in `server/index.ts`
- On macOS/Linux: `lsof -ti:5000 | xargs kill -9`
- On Windows: `netstat -ano | findstr :5000` then `taskkill /PID <PID> /F`

## Support

If you encounter any issues during setup:
1. Check the console output for specific error messages
2. Verify all prerequisites are properly installed
3. Ensure your `.env` file is correctly configured
4. Check that all required services (database, email) are accessible

## Next Steps

After successful setup:
1. Configure email credentials in the Settings page
2. Upload LAS files to the `mcp_resources/las_files/` directory
3. Test the email processing workflow
4. Monitor the dashboard for system status and processing logs