import { app } from "./app.js";

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => console.log(`Rico Sales OS API läuft auf Port ${port}`));
