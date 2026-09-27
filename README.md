InsuredMine Technical Assessment
# Installation

Clone the project:

git clone https://github.com/Gajendra-E/Insuredmine-Technical-Assessment.git
cd Insuredmine-Technical-Assessment

Install dependencies:

npm install

Create .env in the project root:

PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/insuredmine_assessment

Start the application:

npm start

Development mode:

npm run dev

API URL:

http://localhost:5000

# Health Check

GET

http://localhost:5000/health

Expected response:

{
  "success": true,
  "message": "InsuredMine assessment API is running"
}

# Upload CSV/XLSX

POST

http://localhost:5000/api/upload

In Postman:

Body → form-data

Key: file

Type: File

Select the CSV/XLSX file

The file is processed using a Node.js Worker Thread and stored in
MongoDB.

Supported files: .csv, .xlsx

Maximum size: 20 MB.

# Search Policy by Username

GET

http://localhost:5000/api/policies/search?username=John

Example:

curl "http://localhost:5000/api/policies/search?username=John"

Returns policy information for the matching user.

# Policy Summary by User

GET

http://localhost:5000/api/policies/summary

Returns aggregated policy information for each user.

# Creaate Schedule a Message

POST

http://localhost:5000/api/messages

Header:

Content-Type: application/json

Body:

{
  "message": "Insurance policy renewal reminder",
  "day": "2026-09-27",
  "time": "14:30"
}

The scheduled message is stored in MongoDB 

#  View Scheduled Messages

GET

http://localhost:5000/api/messages

Use this endpoint to verify scheduled/completed messages.

# CPU Monitoring

The application checks Node.js process CPU usage every 5 seconds.

When CPU usage reaches 70%, the Node.js process exits and PM2 restarts
it.

Install PM2:

npm install -g pm2

Start:

pm2 start ecosystem.config.js

Check status:

pm2 status

View logs:

pm2 logs insuredmine-api