import arkos from "arkos";

const app = arkos();

app.set("trust proxy", 1);

app.listen();

/*
 

pnpm arkos g cs -m tag -p src/modules/posts/schemas/tags/ - works
pnpm arkos g cs -m tag,post -p src/modules/posts/test-schemas/tags/ - works
pnpm arkos g cs,us -m tag -p src/modules/posts/schemas/tags/
pnpm arkos g c,h -m tag -p src/modules/posts/schemas/tags/
*/
