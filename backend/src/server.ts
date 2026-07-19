import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { globalErrorHandler } from "./middleware/globalErrorHandler";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}
));
app.use(express.json());
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }));
app.use(globalErrorHandler);


app.get("/health", (req, res) => {
  res.send("Server is healthy");
});

app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
});