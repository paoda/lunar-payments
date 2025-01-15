
### Production 
0. `deno i` to install dependencies
1. make sure to set `.env` vars (note: `NODE_ENV` should be set to `production` in the terminal, not by an `.env` file)
2. run `deno task build` to build frontend 
3. `deno task server:start` to run on port 8000

### Development
Steps 0 and 1 are the same. 

2. To start the backend dev server do `deno run -A --env-file --watch ./src/back/main.ts`
3. To start the frontend dev server do `deno task dev`

