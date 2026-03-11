require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Added for frontend connectivity

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); 

// 1. Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hr_system')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ DB Connection Error:', err));

// 2. Employee Schema
const employeeSchema = new mongoose.Schema({
    // Custom Unique ID (Requirement: Auto generated or custom unique)
    empId: { type: String, unique: true, default: () => `EMP-${Math.floor(1000 + Math.random() * 9000)}` },
    fullName: { type: String, required: [true, 'Full name is required'] },
    email: { type: String, required: true, unique: true, lowercase: true },
    phoneNumber: { type: String, required: true },
    department: { 
        type: String, 
        enum: ['HR', 'IT', 'Finance', 'Marketing', 'Operations'], 
        required: true 
    },
    designation: { type: String, required: true },
    salary: { type: Number, required: true, min: [0, 'Salary must be positive'] },
    dateOfJoining: { type: Date, default: Date.now },
    employmentType: { 
        type: String, 
        enum: ['Full-time', 'Part-time', 'Contract'], 
        required: true 
    },
    status: { type: String, default: 'Active', enum: ['Active', 'Inactive'] }
}, { timestamps: true });

const Employee = mongoose.model('Employee', employeeSchema);

// 3. API Routes

// SEARCH: GET /employees/search?name=xyz&department=IT
app.get('/employees/search', async (req, res) => {
    try {
        const { name, department } = req.query;
        let query = {};

        if (name) query.fullName = { $regex: name, $options: 'i' };
        if (department) query.department = department;

        const results = await Employee.find(query);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: "Search failed", details: error.message });
    }
});

// CREATE: POST /employees
app.post('/employees', async (req, res) => {
    try {
        const newEmployee = new Employee(req.body);
        const savedEmployee = await newEmployee.save();
        res.status(201).json(savedEmployee);
    } catch (error) {
        // Handle Duplicate Email Error (Mongo Error Code 11000)
        if (error.code === 11000) {
            return res.status(400).json({ error: "Email already exists" });
        }
        res.status(400).json({ error: error.message });
    }
});

// GET ALL: GET /employees
app.get('/employees', async (req, res) => {
    try {
        const employees = await Employee.find().sort({ createdAt: -1 });
        res.status(200).json(employees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET BY ID: GET /employees/:id
app.get('/employees/:id', async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ error: "Employee not found" });
        res.status(200).json(employee);
    } catch (error) {
        res.status(400).json({ error: "Invalid ID format" });
    }
});

// UPDATE: PUT /employees/:id
app.put('/employees/:id', async (req, res) => {
    try {
        const updatedEmployee = await Employee.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        if (!updatedEmployee) return res.status(404).json({ error: "Employee not found" });
        res.status(200).json(updatedEmployee);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE: DELETE /employees/:id
app.delete('/employees/:id', async (req, res) => {
    try {
        const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);
        if (!deletedEmployee) return res.status(404).json({ error: "Employee not found" });
        res.status(200).json({ message: "Employee deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));