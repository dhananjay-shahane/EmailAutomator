# Email-to-LAS Processing Automation System

## Overview

This is a full-stack web application that automates the processing of LAS (Log ASCII Standard) files through email workflows. The system monitors incoming emails, uses AI to interpret processing requests, executes appropriate scripts via MCP (Model Context Protocol), and returns generated visualizations to the sender. It features a React-based dashboard for monitoring system status, processing queues, and email logs in real-time.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket connection for live dashboard updates

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with JSON responses
- **Real-time Communication**: WebSocket server for broadcasting updates
- **Error Handling**: Global error middleware with structured error responses
- **Development**: Hot module replacement via Vite middleware

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Schema Management**: Drizzle Kit for migrations and schema definitions
- **Session Storage**: PostgreSQL session store (connect-pg-simple)
- **In-Memory Storage**: Fallback storage implementation for development

### Email Processing Pipeline
- **Email Monitoring**: IMAP connection for real-time email fetching
- **Content Parsing**: Mailparser for extracting email content and attachments
- **SMTP Integration**: Nodemailer for sending processed results
- **Processing States**: Tracked through database (received, processing, completed, error)

### AI/LLM Integration
- **LLM Service**: Ollama integration (llama3.2:1b model) via HTTP API
- **Intent Detection**: AI-powered analysis of email content to determine required scripts and tools
- **Confidence Scoring**: LLM provides confidence ratings for processing decisions
- **Structured Responses**: JSON-formatted LLM outputs for reliable parsing

### MCP (Model Context Protocol) Integration
- **Resource Management**: Dynamic loading and management of LAS files, scripts, and tools
- **Script Execution**: Automated execution of Python scripts for data analysis
- **Tool Orchestration**: Coordinated use of specialized tools (depth_plotter, gamma_analyzer, etc.)
- **Output Generation**: PNG file generation with timestamp-based organization

### Authentication and Authorization
- **User Management**: Basic user authentication with hashed passwords
- **Session Management**: PostgreSQL-backed sessions for persistent login
- **API Security**: Middleware-based request validation and error handling

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection and querying
- **drizzle-orm**: Type-safe ORM for database operations
- **drizzle-kit**: Database schema management and migrations
- **express**: Web application framework for the backend API
- **vite**: Build tool and development server for the frontend

### UI and Frontend Libraries
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight routing for React applications
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for managing component variants

### Email Processing
- **imap**: IMAP client for email monitoring and fetching
- **nodemailer**: SMTP client for sending emails
- **mailparser**: Email content parsing and attachment handling

### AI/ML Integration
- **axios**: HTTP client for LLM API communication
- **ollama**: Local LLM inference engine (external service)

### Development and Build Tools
- **typescript**: Static type checking and enhanced development experience
- **esbuild**: Fast bundling for production builds
- **tsx**: TypeScript execution for development
- **postcss**: CSS processing and optimization

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **zod**: Runtime type validation and schema definition
- **clsx**: Conditional CSS class management
- **nanoid**: Unique ID generation for entities