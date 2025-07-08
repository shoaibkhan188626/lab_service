Lab Service
A microservice for managing lab test bookings in the Connected Healthcare Ecosystem. Integrates with Appointment Service (http://appointment-service:8083), User Service (http://user-service:5000), and Notification Service (http://notification-service:8081). Compliant with NDHM (audit logs, ABHA-ready), DPDP Act (consent, encryption, soft deletes), and Telemedicine Guidelines (RBAC, secure APIs).

Repository: https://github.com/shoaibkhan188626/lab-service.git
Default Port: 8085
Base URL: http://localhost:8085
License: MIT

Features

CRUD operations for lab test bookings (blood tests, X-rays, etc.).
Validates patients, doctors (KYC), and labs via User Service.
Creates appointments via Appointment Service.
Sends notifications via Notification Service (RabbitMQ).
RBAC: Patients book, admins manage.
Rate limiting: 50 bookings, 200 retrievals per 15min.
Metrics: Prometheus (/metrics) and Grafana.
Compliance:
NDHM: Audit logs in logs/combined-YYYY-MM-DD.log.
DPDP Act: Consent, encryption, soft deletes.
Telemedicine Guidelines: Secure APIs, RBAC.



Prerequisites

Node.js v18.x+
npm v10.x+
MongoDB 6.x (local or Atlas)
Docker and Docker Compose
Git
Dependent Services:
User Service: http://user-service:5000
Appointment Service: http://appointment-service:8083
Notification Service: http://notification-service:8081
API Gateway: http://api-gateway:8080



Installation

Clone the repository:git clone https://github.com/shoaibkhan188626/lab-service.git
cd lab-service


Install dependencies:npm install



Configuration
Copy .env.example to .env and update:
NODE_ENV=development
PORT=8085
MONGO_URI_LOCAL=mongodb://mongo:27017/lab-service
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/lab-service?retryWrites=true&w=majority
JWT_SECRET=Xy9vA$23k!ZbLp@76JrQmEwTn$HsDfGuIoPaLzXcVbNmQwErTyUiOp1234567890
SERVICE_KEY=a7b9c2d8e4f0g1h2i3j4k5l6m7n8o9p0q1r2s3t4
USER_SERVICE_URL=http://user-service:5000
APPOINTMENT_SERVICE_URL=http://appointment-service:8083
NOTIFICATION_SERVICE_URL=http://notification-service:8081
API_GATEWAY_URL=http://api-gateway:8080
LOG_LEVEL=info
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

Running the Service

Development:npm run dev


Production:npm run build
npm start


Docker:docker-compose up -d
curl http://localhost:8085/health



API Endpoints

GET /health: Health check with database status.
GET /metrics: Prometheus metrics.
POST /api/v1/lab/book: Book a lab test (patient/admin, rate-limited).
GET /api/v1/lab/bookings: List bookings (patient/admin, rate-limited).
GET /api/v1/lab/bookings/:id: Get a booking (patient/admin).
PUT /api/v1/lab/bookings/:id: Update a booking (patient/admin).
DELETE /api/v1/lab/bookings/:id: Soft delete a booking (patient/admin).

Monitoring

Logs: logs/combined-YYYY-MM-DD.log, logs/error-YYYY-MM-DD.log
Metrics: http://localhost:8085/metrics
Prometheus: http://localhost:9090
Grafana: http://localhost:3000

Testing
Run unit and integration tests:
npm test

Compliance

NDHM: Audit logs with user actions, timestamps, and correlation IDs.
DPDP Act: Consent management, AES-256 encryption, soft deletes.
Telemedicine Guidelines: RBAC, secure APIs, JWT authentication.

Contributing

Fork the repository.
Create a feature branch: git checkout -b feature-name.
Commit changes: git commit -m "Add feature-name".
Push: git push origin feature-name.
Open a Pull Request.

Troubleshooting

MongoDB Connection: Check MONGO_URI and logs/error-YYYY-MM-DD.log.
Docker: Run docker-compose logs for errors.
JWT Issues: Verify JWT_SECRET matches across services.

License
MIT License. See LICENSE.