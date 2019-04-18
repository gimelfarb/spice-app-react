# Contributing

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change. 

Please note we have a code of conduct, please follow it in all your interactions with the project.

## Pull Request Process

Good pull requests, whether patches, improvements, or new features, are a fantastic help. They should
remain focused in scope and avoid containing unrelated commits.

**Please ask first** before embarking on any significant pull requests (e.g. implementing features, 
refactoring code), otherwise you risk spending a lot of time working on something that the project's 
developers might not want to merge into the project.

1. [Setup the workspace](#setup-the-workspace)
2. If you cloned before, get the latest changes:
```bash
$ git checkout master
$ git pull upstream master
$ rm -rf node_modules
$ npm install
```
3. Create a new topic branch to contain your changes
```bash
$ git checkout -b <topic-branch-name>
```
4. Make your changes, following the [Coding rules][#coding-rules]
5. Push your topic branch up to your fork:
```bash
$ git push origin <topic-branch-name>
```
6. [Open a Pull Request](https://help.github.com/articles/creating-a-pull-request/#creating-the-pull-request) 
   with a clear title and description.

## Coding rules

### Source code

To ensure consistency and quality throughout the source code, all code modifications must have:
- No [linting](#lint) errors
- A [test](#tests) for every possible case introduced by your code change
- **100%** test coverage
- [Valid commit message(s)](#commit-message-guidelines)
- Documentation for new features
- Updated documentation for modified features

### Documentation

To ensure consistency and quality, all documentation modifications must:
- Prefer [tables](https://help.github.com/articles/organizing-information-with-tables) over [lists](https://help.github.com/articles/basic-writing-and-formatting-syntax/#lists) when listing key values, i.e. List of options with their description
- Use [links](https://help.github.com/articles/basic-writing-and-formatting-syntax/#links) when you are referring to:
  - a concept described somewhere else in the documentation, i.e. How to [contribute](CONTRIBUTING.md)
  - a third-party product/brand/service, i.e. Integrate with [GitHub](https://github.com)
  - an external concept or feature, i.e. Create a [GitHub release](https://help.github.com/articles/creating-releases)
  - a package or module, i.e. [`@nodejs/node`](https://github.com/nodejs/node)
- Use the the [single backtick `code` quoting](https://help.github.com/articles/basic-writing-and-formatting-syntax/#quoting-code) for:
  - commands inside sentences, i.e. the `npm` command
  - programming language keywords, i.e. `function`, `async`, `String`
  - packages or modules, i.e. [`@nodejs/node`](https://github.com/nodejs/node)
- Use the the [triple backtick `code` formatting](https://help.github.com/articles/creating-and-highlighting-code-blocks) for:
  - code examples
  - configuration examples
  - sequence of command lines

### Commit message guidelines

#### Atomic commits

If possible, make [atomic commits](https://en.wikipedia.org/wiki/Atomic_commit), which means:
- a commit should contain exactly one self-contained functional change
- a functional change should be contained in exactly one commit
- a commit should not create an inconsistent state (such as test errors, linting errors, partial fix, feature with documentation etc...)

A complex feature can be broken down into multiple commits as long as each one maintains a consistent state and consists of a self-contained change.

#### Commit message format

Each commit message consists of a **header**, a **body** and a **footer**. The header has a special format that includes a **type**, a **scope** and a **subject**:

```commit
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory and the **scope** of the header is optional.

The **footer** can contain a [closing reference to an issue](https://help.github.com/articles/closing-issues-via-commit-messages).

#### Revert

If the commit reverts a previous commit, it should begin with `revert: `, followed by the header of the reverted commit. In the body it should say: `This reverts commit <hash>.`, where the hash is the SHA of the commit being reverted.

#### Type

The type must be one of the following:

| Type         | Description                                                                                                 |
|--------------|-------------------------------------------------------------------------------------------------------------|
| **build**    | Changes that affect the build system or external dependencies (example scopes: gulp, npm)                   |
| **ci**       | Changes to the CI configuration files and scripts (example scopes: Travis CI, Codecov.io)                   |
| **docs**     | Documentation only changes                                                                                  |
| **feat**     | A new feature                                                                                               |
| **fix**      | A bug fix                                                                                                   |
| **perf**     | A code change that improves performance                                                                     |
| **refactor** | A code change that neither fixes a bug nor adds a feature                                                   |
| **style**    | Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)      |
| **test**     | Adding missing tests or correcting existing tests                                                           |

#### Subject

The subject contains succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- don't capitalize first letter
- no dot (.) at the end

#### Body
Just as in the **subject**, use the imperative, present tense: "change" not "changed" nor "changes".
The body should include the motivation for the change and contrast this with previous behavior.

#### Footer
The footer should contain any information about **Breaking Changes** and is also the place to reference GitHub issues that this commit **Closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

#### Examples

```commit
`fix(pencil): stop graphite breaking when too much pressure applied`
```

```commit
`feat(pencil): add 'graphiteWidth' option`

Fix #42
```

```commit
perf(pencil): remove graphiteWidth option`

BREAKING CHANGE: The graphiteWidth option has been removed.

The default graphite width of 10mm is always used for performance reasons.
```

## Working with code

### Set up the workspace

Before making changes - Fork [this project](../../). Then:

```bash
# Clone your fork
$ git clone https://github.com/<your-name>/<repo-name>
# Go to the cloned folder
$ cd <repo-name>
# Assign original repo to remote 'upstream'
$ git remote add upstream https://github.com/gimelfarb/<repo-name>
```

### Lint

Before pushing your code changes make sure there are no linting errors with `npm run lint`.

### Tests

Before pushing your code changes make sure all **tests pass** and the **coverage is 100%**:

```bash
$ npm run test
```

### Commits

We use [Commitizen](https://github.com/commitizen/cz-cli) to help you create 
[valid commit messages](#commit-message-guidelines).

After staging your changes with `git add`, run `npm run cm` to start the interactive commit message CLI.

## Code of Conduct

### Our Pledge

In the interest of fostering an open and welcoming environment, we as
contributors and maintainers pledge to making participation in our project and
our community a harassment-free experience for everyone, regardless of age, body
size, disability, ethnicity, gender identity and expression, level of experience,
nationality, personal appearance, race, religion, or sexual identity and
orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment
include:

* Using welcoming and inclusive language
* Being respectful of differing viewpoints and experiences
* Gracefully accepting constructive criticism
* Focusing on what is best for the community
* Showing empathy towards other community members

Examples of unacceptable behavior by participants include:

* The use of sexualized language or imagery and unwelcome sexual attention or
advances
* Trolling, insulting/derogatory comments, and personal or political attacks
* Public or private harassment
* Publishing others' private information, such as a physical or electronic
  address, without explicit permission
* Other conduct which could reasonably be considered inappropriate in a
  professional setting

### Our Responsibilities

Project maintainers are responsible for clarifying the standards of acceptable
behavior and are expected to take appropriate and fair corrective action in
response to any instances of unacceptable behavior.

Project maintainers have the right and responsibility to remove, edit, or
reject comments, commits, code, wiki edits, issues, and other contributions
that are not aligned to this Code of Conduct, or to ban temporarily or
permanently any contributor for other behaviors that they deem inappropriate,
threatening, offensive, or harmful.

### Scope

This Code of Conduct applies both within project spaces and in public spaces
when an individual is representing the project or its community. Examples of
representing a project or community include using an official project e-mail
address, posting via an official social media account, or acting as an appointed
representative at an online or offline event. Representation of a project may be
further defined and clarified by project maintainers.

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported by contacting the project team at [INSERT EMAIL ADDRESS]. All
complaints will be reviewed and investigated and will result in a response that
is deemed necessary and appropriate to the circumstances. The project team is
obligated to maintain confidentiality with regard to the reporter of an incident.
Further details of specific enforcement policies may be posted separately.

Project maintainers who do not follow or enforce the Code of Conduct in good
faith may face temporary or permanent repercussions as determined by other
members of the project's leadership.

### Attribution

This Code of Conduct is adapted from the [Contributor Covenant][homepage], version 1.4,
available at [http://contributor-covenant.org/version/1/4][version]

[homepage]: http://contributor-covenant.org
[version]: http://contributor-covenant.org/version/1/4/
