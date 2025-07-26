# EnvPilot

EnvPilot is a modern, open source platform for managing multi-environment deployments, analytics, and team collaboration. It provides a unified dashboard for projects, environments, deployments, notifications, and user management, with seamless Jenkins integration and advanced analytics.

## Features
- Multi-environment deployment management (development, staging, production)
- Centralized environment and project configuration
- Jenkins CI/CD integration
- Real-time build logs and notifications
- Role-based access control (Admin, Developer, QA, User)
- User and project assignment
- System monitoring and analytics dashboard
- Feature flags and system settings
- Modern, responsive UI (React + Tailwind CSS)
- RESTful backend (Spring Boot)

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Java 17+
- Maven
- Jenkins (for CI/CD integration)
- PostgreSQL (default, can be changed)

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/[your-username]/envpilot.git
cd envpilot
```

#### 2. Backend Setup
```bash
cd backend
cp src/main/resources/application.yml.example src/main/resources/application.yml
# Edit application.yml as needed (DB, Jenkins, etc)
mvn clean install
mvn spring-boot:run
```

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm start
```

#### 4. Access the App
- Frontend: http://localhost:3000
- Backend API: http://localhost:9095

## Usage
- Log in as admin (default: admin@envpilot.com / admin123)
- Create and manage projects, environments, and users
- Configure Jenkins for CI/CD
- Monitor deployments and system health
- Assign users to projects and environments

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to your fork (`git push origin feature/your-feature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
