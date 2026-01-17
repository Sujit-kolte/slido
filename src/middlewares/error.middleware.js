export default function errorMiddleware(err, req, res, next) {
  console.error(" Error:", err.message);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Duplicate entry (session code or participant ID)"
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format"
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
}
