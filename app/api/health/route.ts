export async function GET() {
  try {
    return Response.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        message: "API is working correctly",
      },
      { status: 200 },
    )
  } catch (error) {
    return Response.json(
      {
        status: "error",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
