---
sidebar_position: 2
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Installation

On this guide you will learn how to install and create an Arkos.js project.

## System Requirements

Before you begin, make sure your system meets the following requirements:

- [**Node.js**](https://nodejs.org) 20.19 or later.
- macOS, Windows or Linux.

## Quick Start

The quickest way to create a new Arkos.js app is using [**create-arkos**](/docs/cli/create-arkos), which sets up everything automatically for you. To create a project, run:

<Tabs>
<TabItem value="pnpm" label="pnpm" default>

```bash
pnpm create arkos@latest
```

</TabItem>
<TabItem value="npm" label="npm">

```bash
npm create arkos@latest
```

</TabItem>
<TabItem value="yarn" label="Yarn">

```bash
yarn create arkos@latest
```

</TabItem>

</Tabs>

On installation, you'll see the following prompts:

```bash
? What is the name of your project? my-project
? Would you like to use TypeScript? Yes
? What db provider will be used for Prisma? postgresql
? Would you like to set up Validation? Yes
? Choose validation library: zod
? Would you like to set up Authentication? Yes
? Choose authentication type: static
? Choose default username field for login: email
? Would you like to use authentication with Multiple Roles? Yes
```

After the prompts, [**create-arkos**](/docs/cli/create-arkos) will create a folder with your project name and install all required dependencies.
