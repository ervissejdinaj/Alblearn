# AlbLearn - Complete Learning Management System

## Overview

AlbLearn is a comprehensive Learning Management System (LMS) designed
specifically for teaching the Albanian language. The platform provides a modern,
interactive learning experience with role-based access control, progress
tracking, and gamification elements.

## 🎯 Project Goals

- **Language Learning Focus**: Specialized platform for Albanian language
  education
- **Modern User Experience**: Clean, intuitive interface with responsive design
- **Role-Based Access**: Support for students, instructors, and administrators
- **Progress Tracking**: Comprehensive completion tracking and analytics
- **Gamification**: Points, achievements, and learning paths to motivate
  learners

## 🏗️ Architecture

### Frontend (React + TypeScript)

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom green theme
- **State Management**: React Context API for authentication
- **Routing**: React Router v6
- **API Integration**: Custom API client with error handling
- **Animations**: Lottie animations for enhanced UX

### Backend (Laravel)

- **Framework**: Laravel with API-first architecture
- **Authentication**: JWT-based authentication
- **Database**: MySQL with comprehensive relationships
- **API Versioning**: RESTful API with v1 versioning
- **Role Management**: Spatie Laravel Permission package

## 👥 User Roles

### Students

- Browse and enroll in modules
- Access sequential section content
- Complete quizzes and track progress
- Earn points and unlock achievements
- View learning analytics

### Instructors

- Manage assigned modules
- Create and edit sections
- Design quizzes and assessments
- View student progress and analytics
- Upload educational materials

### Administrators

- Full system management
- User role assignment
- Module creation and instructor assignment
- System analytics and reporting
- Content moderation

## 📚 Core Features

### Module Management

- **Module Creation**: Rich content editor with multimedia support
- **Sequential Learning**: Sections must be completed in order
- **Prerequisites**: Module dependencies and learning paths
- **Pricing**: Flexible pricing with discounts and promotions

### Section & Content

- **Rich Content**: HTML content with embedded media
- **Lesson Steps**: Structured learning progression
- **File Attachments**: Support for documents, images, and audio
- **Completion Tracking**: Automatic progress detection

### Quiz System

- **Multiple Question Types**: Multiple choice, open-ended, and more
- **Immediate Feedback**: Real-time answer validation
- **Progress Integration**: Quiz completion affects section progress
- **Analytics**: Detailed performance tracking

### Progress Tracking

- **Section Completion**: Automatic tracking of content consumption
- **Module Progress**: Overall completion percentage
- **Sequential Access**: Previous sections must be completed
- **Real-time Updates**: Live progress synchronization

### Gamification

- **Points System**: Earn points for completing activities
- **Achievements**: Unlockable badges and milestones
- **Learning Paths**: Guided progression through modules
- **Leaderboards**: Competitive learning elements

## 🎨 Design System

### Color Scheme

- **Primary**: Green theme (`#10B981`, `#059669`, `#047857`)
- **Accents**: Pearl white footer, gradient backgrounds
- **Status Colors**: Success (green), warning (yellow), error (red)

### UI Components

- **Cards**: Consistent content containers
- **Buttons**: Primary, secondary, and danger variants
- **Forms**: Styled inputs with validation
- **Navigation**: Responsive header with role-based menus
- **Loading States**: Skeleton loaders and spinners

### Responsive Design

- **Mobile-First**: Optimized for all screen sizes
- **Breakpoints**: Tailwind CSS responsive utilities
- **Touch-Friendly**: Large tap targets and gestures

## 🔧 Technical Implementation

### API Integration

```typescript
// Example API usage
const module = await moduleApi.getBySlug("albanian-basics");
const sections = await sectionApi.list(module.slug);
const progress = await progressApi.module(module.slug);
```

### State Management

```typescript
// Authentication context
const { state: auth, login, logout } = useAuth();
const isInstructor = auth.user?.role === "instructor";
```

### Component Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React contexts (Auth, etc.)
├── pages/              # Route components
│   ├── admin/          # Admin-specific pages
│   ├── instructor/     # Instructor-specific pages
│   ├── user/           # Student-specific pages
│   └── auth/           # Authentication pages
├── services/           # API clients and utilities
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PHP 8.1+ and Composer
- MySQL 8.0+
- Laravel 10+

### Installation

1. Clone the repository
2. Install frontend dependencies: `npm install`
3. Install backend dependencies: `composer install`
4. Configure environment variables
5. Run database migrations
6. Start development servers

### Development

```bash
# Frontend development
npm start

# Backend development
php artisan serve
```

## 📊 API Endpoints

### Authentication

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/user` - Get current user
- `POST /api/v1/auth/logout` - User logout

### Modules

- `GET /api/v1/modules` - List all modules
- `GET /api/v1/modules/{slug}` - Get module details
- `POST /api/v1/modules/{slug}/enroll` - Enroll in module
- `GET /api/v1/modules/{slug}/completion-status` - Get progress

### Sections

- `GET /api/v1/modules/{slug}/sections` - List module sections
- `POST /api/v1/sections/{id}/complete` - Mark section complete
- `GET /api/v1/sections/{id}/progress` - Get section progress

### Quizzes

- `GET /api/v1/sections/{id}/quizzes` - List section quizzes
- `POST /api/v1/quizzes/{id}/submit` - Submit quiz answer

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permissions system
- **Input Validation**: Server-side validation for all inputs
- **CSRF Protection**: Cross-site request forgery prevention
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content sanitization

## 📈 Performance Optimizations

- **Code Splitting**: Lazy loading of route components
- **Image Optimization**: Responsive images with proper sizing
- **Caching**: API response caching and browser caching
- **Bundle Optimization**: Tree shaking and minification
- **Database Indexing**: Optimized database queries

## 🧪 Testing Strategy

- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete user journey testing
- **Performance Tests**: Load and stress testing

## 📱 Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Progressive Enhancement**: Graceful degradation for older browsers

## 🔮 Future Enhancements

- **Mobile App**: React Native mobile application
- **Video Integration**: Live streaming and video lessons
- **Social Features**: Discussion forums and peer interaction
- **AI Integration**: Personalized learning recommendations
- **Offline Support**: PWA capabilities for offline learning
- **Multi-language**: Support for additional languages

## 📄 License

This project is proprietary software developed for Albanian language education.

## 🤝 Contributing

This is a private project. For questions or suggestions, please contact the
development team.

---

**AlbLearn** - Empowering Albanian language learning through technology.
