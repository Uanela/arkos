import {
  Code,
  Shield,
  Layers,
  CheckSquare,
  Database,
  Upload,
  Mail,
  FileText,
} from "lucide-react";
import { Image } from "fumadocs-core/framework";

export const arkosFeatures = [
  {
    title: "Instant API Generation",
    description: (
      <>
        Transform your{" "}
        <strong>Prisma models into production-ready REST endpoints</strong> in
        seconds.
        <br />
        Includes <em>authentication, validation, and file uploads</em>
        —everything you need to ship fast.
      </>
    ),
    Icon: Code,
    outline: "hover:outline-sky-500/50",
    titleHover: "group-hover:text-sky-500/80",
    to: "/docs/core-concepts/endpoints-generation",
    sideContent: (
      <div className="">
        <Image
          src="/img/feats/instant-api-generation.webp"
          className="rounded-md  "
        />
      </div>
    ),
  },
  {
    title: "Unmatched Prisma Integration",
    description: (
      <>
        <strong>Database management</strong> built on{" "}
        <a
          href="https://prisma.io"
          target="_blank"
          className="text-[#50a496] underline"
        >
          <strong>Prisma's</strong>
        </a>{" "}
        rock-solid foundation with seamless ORM integration.
        <br />
        Write less Prisma, <em>build more data</em>.
      </>
    ),
    Icon: Database,
    iconColor: "#50a496",
    outline: "hover:outline-indigo-500/50",
    titleHover: "group-hover:text-indigo-500/80",
    to: "/docs/guide/custom-prisma-query-options",
    sideContent: (
      <div className="">
        <Image
          src="/img/feats/unmatched-prisma-integration.webp"
          className="rounded-md  "
        />
      </div>
    ),
  },
  {
    title: "Enterprise-Ready Authentication",
    description: (
      <>
        <strong>
          <a
            href="https://jwt.io"
            target="_blank"
            className="text-[#f43f5e] underline"
          >
            JWT
          </a>{" "}
          authentication that just works.
        </strong>{" "}
        Password hashing, token management,
        <br />
        and role-based access control—all{" "}
        <em>production-ready out of the box</em>.
      </>
    ),
    Icon: Shield,
    iconColor: "#f43f5e",
    outline: "hover:outline-green-500/50",
    titleHover: "group-hover:text-green-500/80",
    to: "/docs/core-concepts/authentication-system",
    sideContent: (
      <div className="">
        <Image
          src="/img/feats/enterprise-ready-authentication.webp"
          className="rounded-md  "
        />
      </div>
    ),
  },
  {
    title: "Bulletproof Security Stack",
    description: (
      <>
        <strong>Enterprise-grade protection</strong> with rate limiting, CORS,
        input sanitization,
        <br />
        and comprehensive error handling. <em>Deploy with confidence</em> from
        day one.
      </>
    ),
    Icon: Layers,
    iconColor: "#dc2626",
    outline: "hover:outline-red-500/50",
    titleHover: "group-hover:text-red-500/80",
    to: "/docs/guide/built-in-middlewares",
    sideContent: (
      <div className="">
        <Image
          src="/img/feats/bulletproof-security-stack.webp"
          className="rounded-md  "
        />
      </div>
    ),
  },
  {
    title: "Smart Data Validation",
    description: (
      <>
        <strong>Automatic request validation</strong> using your favourite
        validation libraries.
        <br />
        Generate{" "}
        <em>
          JSON schemas from Zod, class-validator, or directly from Prisma models
        </em>
        —zero configuration required.
      </>
    ),
    Icon: CheckSquare,
    iconColor: "#a855f7",
    outline: "hover:outline-purple-500/50",
    titleHover: "group-hover:text-purple-500/80",
    to: "/docs/core-concepts/request-data-validation",
    sideContent: (
      <div className="">
        <Image
          src="/img/feats/smart-data-validation.webp"
          className="rounded-md  "
        />
      </div>
    ),
  },
  {
    title: "Self-Documenting APIs",
    description: (
      <>
        <strong>Interactive documentation</strong> with beautiful{" "}
        <a
          href="https://scalar.com"
          target="_blank"
          className="text-[#eab308] underline"
        >
          <strong>Scalar UI</strong>
        </a>{" "}
        and{" "}
        <a
          href="https://scalar.com"
          target="_blank"
          className="text-[#eab308] underline"
        >
          <strong>OpenAPI</strong>
        </a>{" "}
        specifications.
        <br />
        Auto generate json schemas from your zod schemas, class-validator dtos
        or directly from your Prisma models.
      </>
    ),
    Icon: FileText,
    iconColor: "#eab308",
    outline: "hover:outline-yellow-500/50",
    titleHover: "group-hover:text-yellow-500/80",
    to: "/docs/core-concepts/open-api-documentation",
    sideContent: (
      <div className="">
        <Image
          src="/img/feats/self-documenting-apis.webp"
          className="rounded-md  "
        />
      </div>
    ),
  },
  {
    title: "Intelligent File Processing",
    description: (
      <>
        <strong>Advanced file upload capabilities</strong> powered by{" "}
        <a
          href="https://github.com/expressjs/multer"
          target="_blank"
          className="text-[#fb7185] underline"
        >
          <strong>Multer</strong>
        </a>{" "}
        with automatic optimization.
        <br />
        Easy local storage and smart type validation.{" "}
        <em>Images, videos, docs—handled effortlessly</em>.
      </>
    ),
    Icon: Upload,
    iconColor: "#fb7185",
    outline: "hover:outline-rose-500/50",
    titleHover: "group-hover:text-rose-500/80",
    to: "/docs/core-concepts/file-uploads",
    sideContent: (
      <div className="">
        <Image
          src="/img/feats/intelligent-file-processing.webp"
          className="rounded-md  "
        />
      </div>
    ),
  },
  {
    title: "Effortless Email Integration",
    description: (
      <>
        <strong>Built-in emailService object</strong> powered by{" "}
        <a
          href="https://nodemailer.com"
          target="_blank"
          className="text-[#06b6d4] underline"
        >
          <strong>Nodemailer</strong>
        </a>{" "}
        that lets you send emails effortlessly.
        <br />
        <em>Clean, simple API</em>—just focus on your content.
      </>
    ),
    Icon: Mail,
    iconColor: "#06b6d4",
    outline: "hover:outline-cyan-500/50",
    titleHover: "group-hover:text-cyan-500/80",
    to: "/docs/core-concepts/sending-emails",
    sideContent: (
      <div className="">
        <Image
          src="/img/feats/effortless-email-integration.webp"
          className="rounded-md  "
        />
      </div>
    ),
  },
];
