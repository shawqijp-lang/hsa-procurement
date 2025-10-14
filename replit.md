# Overview

This project is a comprehensive work environment management system designed to track daily workplace assessments across multiple locations, generate detailed reports, and manage user access. It features a bilingual interface (Arabic and English) and a distinct yellow and black brand theme. The system aims to provide a robust, modern solution for workplace environment management, enhancing operational efficiency and data-driven decision-making with features like intelligent analysis and comprehensive reporting, with a strong emphasis on complete company data segregation. The system is built for scalability, supporting multiple companies with a unified codebase.

# User Preferences

Preferred communication style: Simple, everyday language.
Development preference: All future feature additions must automatically include offline functionality support including IndexedDB integration, Service Worker caching, and sync queue management. Enhanced with enterprise-grade data protection systems including smart storage management, tiered backup systems, and continuous health monitoring. Enhanced offline mode implemented with secure credential storage, simplified offline login (no password required), comprehensive data caching, and intelligent sync management. **IMPORTANT:** Always enhance existing systems rather than creating new parallel systems - user strongly prefers improving current implementations.
Architecture preference: Unified system with complete company data segregation - optimized for scaling to 20+ companies with single codebase maintenance. Enhanced General Manager role has cross-company oversight with specific focus on: 1) Location evaluation viewing across all companies with company filtering, 2) Manager-only user administration (add/remove/reset passwords), 3) Company creation with default setups, 4) Detailed graphical dashboard filterable by company.
Calendar system preference: Exclusive use of Gregorian calendar throughout the application - all dates formatted with explicit `calendar: 'gregory'` specification and 'ar-EG' locale.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite for development and production builds
- **UI/UX Decisions**: Bilingual interface (Arabic/English), yellow and black brand theme, PWA with custom icons and fullscreen mobile experience, responsive design for all forms and interfaces. Prioritizes intuitive UI/UX with clear visual feedback and streamlined workflows.

## Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with JWT-based authentication
- **Session Management**: JWT tokens with bcrypt for password hashing
- **Error Handling**: Centralized error middleware with structured responses

## Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection Pooling**: Connection pooling via Neon serverless client

## Technical Implementations & Feature Specifications
- **Authentication**: JWT-based authentication with role-based access, bcrypt for password hashing, protected routes, and session persistence. Includes rate limiting and comprehensive security headers.
- **Enhanced Role-Based Permissions System**: Advanced multi-layer permission system with cryptographic protection, audit logging, and automatic integrity checking.
- **Enhanced Synchronization System**: Advanced automatic sync with intelligent connection quality detection, adaptive sync strategies, exponential backoff retry mechanisms, smart batch processing, connection monitoring, and enhanced error handling.
- **Unified IndexedDB System**: Comprehensive PWA support with completely unified IndexedDB architecture featuring: unlimited storage capacity, superior performance, single centralized offline management system, unified storage access pattern, smart conflict resolution, secure metadata storage, automatic sync queue management, visual offline indicators, and robust refresh protection. IndexedDB is used exclusively for all data storage, authentication, user data, settings, and offline functionality.
- **Location Management**: CRUD operations for locations, icon-based identification, location-specific checklist templates, and flexible access control.
- **Checklist System**: Template-based checklists with multi-language support, multi-task, multi-category, and multi-Arabic name functionality per item. Supports sub-points and sub-tasks for detailed breakdown. Automatic evaluation based on sub-task ratings.
- **Reporting System**: Comprehensive report generation (daily, weekly, monthly) with Excel and HTML export, including real-time preview and visual statistics. Features intelligent built-in analysis for performance, problematic tasks, and actionable recommendations. Multi-location and multi-user selection for reports.
- **User Management**: Admin-only user creation, role assignment, password reset, activity tracking. Granular control over user permissions and dashboard section visibility, including complete company isolation and real-time permission synchronization.
- **Dashboard Management**: Customizable dashboard sections visible/hidden based on user roles and admin preferences.
- **Internationalization**: Full Arabic and English language support with RTL/LTR interface.
- **Aggressive UI Simplification**: Removed non-functional settings, replaced with "System Information" displaying actual system data, and reduced interface complexity.
- **Auto-Update System**: Intelligent automatic update detection with version polling every 60 seconds, automatic cache clearing (Browser Cache + Service Worker Cache), and seamless app reload when new versions are deployed. No user intervention required - updates apply automatically in the background.

## System Design Choices
- **Full-stack architecture**: Separation of concerns between frontend (React) and backend (Node.js).
- **Modularity**: Components and features are designed to be modular and reusable.
- **Scalability**: Utilizes serverless PostgreSQL and connection pooling for scalable database operations.
- **Security**: JWT for authentication, bcrypt for password hashing, secure API design, robust company segregation, role-based access controls, and rate limiting.
- **User Experience**: Prioritizes intuitive UI/UX with responsive design, clear visual feedback, and streamlined workflows, including mobile-first touch optimization.
- **Offline-First Approach**: Core design principle ensuring seamless operation regardless of internet connectivity.
- **Unified Environment**: Single codebase and configuration for all environments (development and production).
- **Database Schema Isolation**: Enhanced fail-secure mechanisms with production-grade schema isolation, automatic schema bootstrapping, and comprehensive verification of schema integrity to prevent cross-environment data leakage.
- **Production-Development Synchronization**: Advanced one-way data synchronization system from production to development using PostgreSQL schema isolation.

# External Dependencies

## UI and Styling
- **Radix UI**: Primitives for accessible and customizable UI components.
- **Tailwind CSS**: Utility-first CSS framework for rapid styling.
- **IBM Plex Sans Arabic**: Custom font for Arabic text support.
- **Lucide React**: Icon library for consistent iconography.
- **Chart.js**: For interactive data visualizations in smart reports.

## Database and Authentication
- **Neon Database**: Serverless PostgreSQL hosting.
- **JWT**: For secure, token-based authentication.
- **bcrypt**: For password hashing.

## Development Tools
- **Vite**: Fast build tool for development and production.
- **TypeScript**: For type safety across the entire codebase.
- **ESLint**: For code linting and maintaining code quality.
- **PostCSS**: For CSS transformations and optimizations.