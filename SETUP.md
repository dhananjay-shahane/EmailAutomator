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

**Note**: This project now uses JSON files for data storage instead of a database, making setup much simpler!

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

This project uses `uv` for Python package management, which provides faster and more reliable dependency resolution.

#### Option 1: Automatic Installation (Recommended)
The Python dependencies will be automatically installed when you run the application for the first time. The project includes a `pyproject.toml` file that defines all required packages.

#### Option 2: Manual Installation
If you want to install Python dependencies manually:

```bash
# Navigate to the project root
cd <project-directory>

# Install uv (Python package manager)
pip install uv

# Install project dependencies
uv add matplotlib numpy pandas lasio

# Or install individually if needed
uv add matplotlib
uv add numpy  
uv add pandas
uv add lasio
```

#### Required Python Packages:
- **matplotlib**: For generating data visualizations and charts
- **numpy**: For numerical computations and data processing
- **pandas**: For data manipulation and analysis
- **lasio**: For reading and processing LAS (Log ASCII Standard) files

### Step 4: Configuration Setup (Optional)

The application now uses JSON files for data storage, so no database setup is required! However, you can still configure optional features:

1. Create a `.env` file in the project root (optional):
```bash
touch .env
```

2. Add optional configuration to `.env`:
```env
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

# Session Secret (optional, will use default if not provided)
SESSION_SECRET="your-secret-key-here"
```

**Data Storage**: The application automatically creates a `data/storage.json` file to store all your data. No setup required!

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

### Step 5: Start the Development Server
```bash
npm run dev
```

This command will:
- Start the Express.js backend server
- Start the Vite development server for the React frontend
- Enable hot module replacement for development

The application will be available at: `http://localhost:5000`

## Python Environment Verification

Before testing the main application, verify that the Python environment is working correctly:

### Test Python Dependencies
```bash
# Test that all packages are available
uv run python -c "import matplotlib, numpy, pandas, lasio; print('All Python dependencies are working!')"

# Test a specific analysis script
cd mcp_resources
uv run python scripts/gamma_ray_analyzer.py las_files/production_well_02.las ../output/test_gamma.png

# Check if the output file was created
ls -la output/test_gamma.png
```

### Verify LAS File Processing
```bash
# List available LAS files
ls -la mcp_resources/las_files/

# List available analysis scripts  
ls -la mcp_resources/scripts/
```

You should see files like:
- `production_well_02.las` - Sample LAS data file
- `gamma_ray_analyzer.py` - Gamma ray analysis script
- `depth_visualization.py` - Depth plotting script
- And other analysis scripts

## Verification Steps

### 1. Check Frontend
- Open `http://localhost:5000` in your browser
- You should see the dashboard with system status indicators
- Verify that the navigation works (Dashboard, Settings pages)

### 2. Check Backend API
- Open `http://localhost:5000/api/dashboard` in your browser
- You should see JSON data with system status

### 3. Check Data Storage
- The dashboard should show system status indicators
- Data is automatically saved to `data/storage.json`
- No database setup required!

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

### Issue: "Data not saving or loading"
- **Solution**: Check that the application has write permissions in the project directory
- Ensure the `data/` folder can be created
- Check file system permissions

### Issue: "Module not found" errors
- **Solution**: Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then run `npm install`

### Issue: Python scripts not working
- **Solution**: Ensure Python dependencies are installed using uv: `uv add matplotlib numpy pandas lasio`
- Verify uv is installed: `pip install uv`
- Test Python environment: `uv run python -c "import matplotlib; print('Working!')"`
- Check that scripts are being executed with `uv run python` not plain `python3`

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