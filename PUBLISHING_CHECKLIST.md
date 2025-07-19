# RealtimeCursor Publishing & Deployment Checklist

Use this checklist to ensure you've completed all the necessary steps to make RealtimeCursor available as a library/package.

## SDK Publishing

- [ ] Update SDK version in `sdk/package.json` if needed
- [ ] Ensure author and other metadata is correct in `sdk/package.json`
- [ ] Build the SDK with `cd sdk && npm run build`
- [ ] Login to npm with `npm login`
- [ ] Publish the SDK with `cd sdk && ./publish.sh`
- [ ] Verify the package is available on npm: https://www.npmjs.com/package/realtimecursor-sdk

## Backend Deployment

### Render Deployment
- [ ] Push code to GitHub
- [ ] Connect Render to GitHub repository
- [ ] Configure environment variables in Render
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_KEY
  - [ ] JWT_SECRET
- [ ] Deploy using `./deploy.sh render`
- [ ] Note the deployed API URL: ______________________

### Docker Deployment
- [ ] Build Docker image with `./deploy.sh docker`
- [ ] Configure environment variables
- [ ] Run Docker container
- [ ] Note the deployed API URL: ______________________

### Manual Deployment
- [ ] Follow instructions in `./deploy.sh manual`
- [ ] Note the deployed API URL: ______________________

## Documentation Update

- [ ] Update documentation links with `./update-docs.sh [api_url] [socket_url]`
- [ ] Verify links are correct in:
  - [ ] README.md
  - [ ] sdk/README.md
  - [ ] landing/index.html (if exists)
  - [ ] landing/docs.html (if exists)
- [ ] Commit and push updated documentation

## Final Verification

- [ ] Test SDK installation from npm in a new project
- [ ] Verify backend API is accessible
- [ ] Test real-time functionality
- [ ] Verify user authentication works
- [ ] Check that cursor tracking is functioning

## Marketing & Distribution

- [ ] Update website with installation instructions
- [ ] Create announcement for social media
- [ ] Write blog post about the release
- [ ] Notify existing users about the availability

## Notes

Use this space for any additional notes or issues encountered during the process:

_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________