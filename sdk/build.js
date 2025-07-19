const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Copy files from src to dist
const files = fs.readdirSync('src');
files.forEach(file => {
  const srcPath = path.join('src', file);
  const destPath = path.join('dist', file.replace('.ts', '.js').replace('.tsx', '.js'));
  
  // Read the file content
  const content = fs.readFileSync(srcPath, 'utf8');
  
  // Write the file to dist
  fs.writeFileSync(destPath, content, 'utf8');
  
  console.log(`Copied ${srcPath} to ${destPath}`);
});

// Create a simple index.d.ts file
const indexDts = `
export interface RealtimeCursorConfig {
  apiUrl: string;
  socketUrl?: string;
  token?: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role?: string;
}

export class RealtimeCursorSDK {
  constructor(config: RealtimeCursorConfig);
  login(email: string, password: string): Promise<User>;
  register(userData: { email: string; password: string; firstName: string; lastName: string }): Promise<User>;
  getCurrentUser(): Promise<User>;
  logout(): void;
}

export function useRealtimeCursor(config: RealtimeCursorConfig): {
  client: RealtimeCursorSDK;
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (userData: { email: string; password: string; firstName: string; lastName: string }) => Promise<User>;
  logout: () => void;
};

export function createRealtimeCursorClient(config: RealtimeCursorConfig): RealtimeCursorSDK;
`;

fs.writeFileSync('dist/index.d.ts', indexDts, 'utf8');
console.log('Created index.d.ts');

// Create package.json in dist
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
packageJson.main = 'index.js';
packageJson.types = 'index.d.ts';
delete packageJson.scripts;
delete packageJson.devDependencies;

fs.writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 2), 'utf8');
console.log('Created package.json in dist');

console.log('Build completed successfully!');