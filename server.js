const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// ✅ Connect to MongoDB Atlas
mongoose.connect('mongodb+srv://Cluster83186:Madhup7008@cluster83186.1zp1nyt.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// ✅ Model Definitions
const studentSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true },
  email: { type: String, unique: true },
});

const Student = mongoose.model('Student', studentSchema);

const feeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  amount: Number,
  dueDate: Date,
  paid: { type: Boolean, default: false },
  paidOn: Date
});

const Fee = mongoose.model('Fee', feeSchema);

// Delete student by ID
app.delete('/api/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Student.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting student' });
  }
});

// Register student
app.post('/api/register', async (req, res) => {
  const { name, phone, email } = req.body;

  if (!name || !phone || !email) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const phonePattern = /^[6-9]\d{9}$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!phonePattern.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    // ✅ Check for existing phone or email
    const existing = await Student.findOne({
      $or: [{ phone }, { email }],
    });

    if (existing) {
      return res.status(409).json({ error: 'Phone or Email already registered' });
    }

    const student = new Student({ name, phone, email });
    await student.save();
    res.status(201).json({ message: 'Student registered' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Add fee
app.post('/add_fee', async (req, res) => {
  try {
    const { studentId, amount, dueDate, paid } = req.body;
    const fee = new Fee({
      studentId,
      amount,
      dueDate,
      paid,
      paidOn: paid ? new Date() : null
    });
    await fee.save();
    res.json({ message: 'Fee added', fee });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update fee status
app.put('/update_fee/:feeId', async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.feeId);
    if (!fee) return res.status(404).json({ error: 'Fee not found' });

    fee.paid = req.body.paid;
    fee.paidOn = req.body.paid ? new Date() : null;
    await fee.save();
    res.json({ message: 'Fee updated', fee });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get unpaid fees
app.get('/unpaid_fees', async (req, res) => {
  try {
    const unpaidFees = await Fee.find({ paid: false }).populate('studentId');
    const result = unpaidFees.map(fee => ({
      name: fee.studentId.name,
      phone: fee.studentId.phone,
      amount: fee.amount,
      dueDate: fee.dueDate
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all fees with student info
app.get('/all_fees', async (req, res) => {
  try {
    const allFees = await Fee.find({}).populate('studentId');
    const result = allFees.map(fee => ({
      _id: fee._id,
      student: fee.studentId ? {
        name: fee.studentId.name,
        phone: fee.studentId.phone,
        email: fee.studentId.email
      } : null,
      amount: fee.amount,
      dueDate: fee.dueDate,
      paid: fee.paid,
      paidOn: fee.paidOn
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});


// ✅ STUDENTS WITH FEES ROUTE!
app.get('/api/students_with_fees', async (req, res) => {
  try {
    const students = await Student.find();

    const studentsWithFees = await Promise.all(
      students.map(async (student) => {
        const fees = await Fee.find({ studentId: student._id }).sort({ dueDate: -1 });
        return {
          ...student.toObject(),
          fees,
        };
      })
    );

    res.json(studentsWithFees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch students with fees' });
  }
});

app.listen(5050, () => console.log('Server running at http://localhost:5050'));

app.get("/", (req, res) => {
  res.send("✅ Backend is running on Render!");
});
