<a href="https://onyx-rho-pink.vercel.app/">
  <img alt="Onyx open graph image." src="https://quantumone.b-cdn.net/onyx-git/og-image.jpg">
  <h1 align="center">Onyx MVP Template</h1>
</a>

<a href="https://securityheaders.com/">
  <img alt="Onyx security score image." src="https://quantumone.b-cdn.net/onyx-git/onyx-security-score-ls.jpg">
  <h2 align="center">Onyx SecurityHeaders.com Score</h2>
</a>


### What is Onyx?
- Onyx is a turnkey, full stack NextJS 14+ progressive web app written in Typescript that includes role based access control (RBAC),
complete Supabase SSR Auth and DB integration, Zod validation, Tanstack React Query, Rust serverless function runtime and API, Markdown pages with ability to insert React components, React Hook form, and more. Fork, customize, and deploy on Vercel or elsewhere to have your MVP up and running in a few days or less. Stack details are below. 

### Stack and Features
- NextJS 14 App Router in Typescript 
- Supabase 
  - SSR Auth with
    - Fully configured email/password signup, login, oauth, PKCE and confirm routes 
    - middleware 
    - server actions
    - typed Auth & DB clients
    - readOnly userSession clients
  - Postgres DB with CRUD functions configured
    - User account and profile management configured 
    - RBAC configured admin dashboard with data visualization, members administration and todo lists
    - Contact form with toast, Zod validation, server side table insert  
- TanStack React Query, Table, and Dev Tools
  - Demo SSR with Supabase DB & cache helpers 
- Zod data validation, schemas, event handling.
- Shadcn-UI, Radix-UI primitives, Tailwind CSS
- Markdown pages with Next/MDX - create page.mdx and layout.tsx for each markdown page
- Next-PWA
- Next Compose Plugins  
- React Hook Form
- OpenAI playground UI
- Onboarding, signIn/signUp pages
- Podcast UI
- CookieButton component configured to work with Consent Manager from Termly free plan. Just create a free Termly account, add your Script tag on the app/layout page using Next Script and then add your CookieButton to your app/layout just above the ThemeProvider and just below your termly Script tag.  
- Custom Formik Components with MUI are not used in app but code is solid for use in a "MUI Base X TailwindCSS config". Onyx is NOT currently configured for MUI nor MUI Base X TailwindCSS. 
- Lucide React Icons with many brand SVGs ready for your props 
- More..

### API 
- [Rust runtime for Vercel Serverless Functions](https://github.com/vercel-community/rust)

### Getting started with Onyx:
- First, configure your environment
  - Create a file named .env.local in project root
  - Create a Supabase account and add the following to your env file
    - NEXT_PUBLIC_SUPABASE_ANON_KEY="Your supabase anon key"
    - SUPABASE_JWT_SECRET="Your supabase JWT secret"
    - NEXT_PUBLIC_SUPABASE_URL="Your supabase project URL"
    - SUPABASE_SERVIC_ROLE_KEY="Your supabase service role key"

  - Ensure your Supabase tables match the tables and types found in '@/lib/supabase'.
  - Add authorized development and production URL's to Supabase URL config. 
### Run  
- Development server:

```bash
npm i && npm run dev
# or
yarn i && yarn run dev
# or
pnpm i && pnpm dev
# or
bun i && bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


### Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frmourey26%2Fonyx%2Ftree%2Fmain)


### Reference/Credit
- @chensokheng


### Tips/Support
<a href="https://www.buymeacoffee.com/rmoureyjr" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="51" width="217"></a>

## CI/CD automation

This template ships with infrastructure and service workflows that rely on GitHub Actions OpenID Connect (OIDC) federation to authenticate with AWS. Provide the required AWS IAM roles and repository secrets/variables before enabling the pipelines.

### Workflows overview

- `.github/workflows/infra-ci.yml` plans Terraform located under `infra/` on every pull request and main branch push. Plans are uploaded as artifacts, and a manual `workflow_dispatch` run with the `apply` input applies the changes. Configure the IAM role ARN in the `AWS_INFRA_ROLE_ARN` repository secret and optionally override the Terraform and AWS versions via repository variables (`TERRAFORM_VERSION`, `AWS_REGION`).
- `.github/workflows/service-ci.yml` discovers services under `services/<service>` that contain a `Dockerfile` and a matching Helm chart in `deploy/charts/<service>`. For every detected service the workflow builds and pushes container images to Amazon ECR, packages the Helm chart, pushes it to the same registry using OCI support, and optionally triggers a deployment.

### AWS OIDC setup

1. Create IAM roles (one for infrastructure, one for services) with `sts:AssumeRoleWithWebIdentity` trust policies granting access to your GitHub repository (`token.actions.githubusercontent.com`).
2. Attach the permissions needed for Terraform state management, ECR, and Helm chart publishing to the respective roles.
3. Store the role ARNs in repository secrets: `AWS_INFRA_ROLE_ARN` for infrastructure and `AWS_SERVICE_ROLE_ARN` for service deployments.
4. Add repository variables for shared settings such as `AWS_REGION`, `ECR_REPOSITORY_PREFIX` (e.g., `platform-`), `HELM_REPOSITORY_PREFIX` (e.g., `helm-`), and `DEFAULT_DEPLOY_ENV`.

### Service build, publish, and deploy

1. Place service source code in `services/<service>` with a `Dockerfile` (or `Dockerfile.<ext>`), and add a matching Helm chart in `deploy/charts/<service>`.
2. On pull requests the workflow builds the image, pushes it to ECR tagged with the commit SHA and `<environment>` (default `dev`), packages the Helm chart with the commit SHA as the application version, and uploads the artifact.
3. Configure Argo CD integration by adding the optional secrets `ARGOCD_SERVER` and `ARGOCD_AUTH_TOKEN`. Repository variables `ARGOCD_APP_NAME`, `ARGOCD_PROJECT`, and `ARGOCD_VERSION` customise the sync behaviour. When present, the workflow installs the Argo CD CLI, updates the service image parameter, and synchronises the application to the target cluster.
4. If Argo CD is not available, the packaged chart artifact can be used manually with `helm upgrade --install` and the pushed image tag from the workflow summary.

### Promotion strategy

1. Merge to `main` (or run the workflow manually) to produce the dev build, image, chart, and optionally trigger an Argo CD deployment to the dev environment.
2. Promote builds by re-running the `Service Build and Deploy` workflow via `workflow_dispatch`, selecting the target service and `environment` (`staging` or `prod`). The job re-tags the commit image (e.g., `:staging`) and pushes the chart, allowing Argo CD to pick up the promotion automatically.
3. Use environment-specific Helm values (`values-dev.yaml`, `values-staging.yaml`, etc.) in your charts to tune configuration per environment. The workflow passes the image repository and tag through chart parameters for Argo CD-managed applications.
4. Monitor the Argo CD sync or helm upgrade status to confirm the deployment and then proceed with any post-deployment validation.

### Infrastructure changes

- Push Terraform updates under `infra/` to trigger formatting, validation, and planning automatically. The generated plan is attached to the workflow run.
- To apply changes, dispatch the workflow manually from the Actions tab, enable the `apply` input, and confirm the run. The same AWS role is reused for the apply step.
