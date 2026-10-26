import app from './src/app.js';
import { connectDB } from './src/db.js';

const port = Number(process.env.PORT) || 5050;

await connectDB();
app.listen(port, () => console.log(`MealBridge API listening on http://localhost:${port}`));
