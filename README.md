# spice-app-react 
[![Build Status][travis-badge]][travis-href] [![Coverage Status][codecov-badge]][codecov-href] [![Semantic Versioning][semrel-badge]][semrel-href]

[travis-href]: https://travis-ci.org/gimelfarb/spice-app-react
[codecov-href]: https://codecov.io/gh/gimelfarb/spice-app-react
[semrel-href]: https://github.com/semantic-release/semantic-release

[travis-badge]: https://img.shields.io/travis/gimelfarb/spice-app-react/master.svg
[codecov-badge]: https://img.shields.io/codecov/c/gh/gimelfarb/spice-app-react.svg
[semrel-badge]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg

Blends/injects React app functionality into an existing static HTML site (possibily generated with tools like Webflow, Wix, etc), **without taking over** the markup. Each React component "hooks" into an element already on the page, so that it can be dynamically controlled. It's pure magic! ✨

**WARNING**: *Under active development - this is still alpha quality, use at your own risk!*

## Motivation

On any sizeable project, it is common to separate design and development tasks. Visual design (i.e. static HTML) is produced by the "designer", sometimes using HTML-generating tools to help the process. Even on a single-developer projects, one would want to choose tools like Webflow / Wix to create a stunning visual design, or find a pre-existing static HTML template.

If "developer" wants to then use a modern framework like React to implement client-side logic, they are faced with a significant task of breaking up static HTML into React components. This often has to repeat again, as "designer" continues to iterate and improve the visual design, and merging changes back into the codebase poses a challenge. Others have already created some build-time tools to automate the process (see [acknowledgments](#acknowledgments)).

There are challenges with a build-time transpiling approach:
- Tools like Webflow/Wix may not be able to export HTML
  - e.g. in Webflow HTML export feature requires an Account plan (on top of hosting)
- More cumbersome to iterate quickly, requiring to export and build app to see changes
- Difficult for "designer" to test his/her changes without "developer" involvement
- If only a small part of the site is being controlled with client-side logic, it feels cumbersome to transpile a whole lot of markup into React components
- Some parts of the page (i.e. simple visual effects) are controlled with a JS library, and the logic would need to be ported to React, if the whole page is transpiled

**spice-app-react** takes a different approach - instead of transpiling full static HTML markup into React, it **blends/injects React bits where needed at run-time**, and leaves the rest untouched. Generated React DOM tree is merged into existing HTML markup by recursively matching DOM elements, and then wiring them together. As such, React app is largely unaware of the HTML markup, other than IDs/names (and loose hierarchy) of the elements it wants to control on the page.

## Getting Started

### Installation

At a minimum, install the library:

```bash
$ npm i --save spice-app-react
```

Then, where ReactDOM is normally initialized, replace `ReactDOM.render(...)`:

```javascript
import React from 'react';
// (instead of): import ReactDOM from 'react-dom';
import Spice from 'spice-app-react';
import App from './App';

// (instead of): ReactDOM.render(<App />, document.getElementById('root'));
Spice.blend(<App />, document.body);
```

Now React component tree will be **blended/merged** with the existing DOM. Place the full markup into `index.html`, including references to any CSS (or visual [effects JS](#what-is-an-effects-js)), and use React App to only control specific elements on the page, without affecting the rest.

### Using with Create React App

If you're using [create-react-app](https://facebook.github.io/create-react-app/), then follow steps above and inside `src/index.js` replace `ReactDOM.render(...)` with `Spice.blend(<App />, document.body)`.

**IMPORTANT**: All of your site static assets, e.g. HTML / CSS + any effects JS, that you normally receive from the web designer, should be copied to `public/` folder (including the updated `index.html`). Remember, that React is not rendering the entire app now, but instead works with an existing DOM to **enhance** it.

### Using with Webflow, Wix, or another hosted static HTML design

It's common to share static site design by hosting it - Webflow or Wix provide this out-of-the-box, or files uploaded via tools like [Surge](https://surge.sh) (seriously, [Surge](https://surge.sh) is awesome! 👍). We can then setup a local development environment by proxying site content from the remote URL, and injecting our app script into it! Remote URL can continue to reflect latest changes, while we work on enhancing the site through React locally.

Checkout the [sample app](TODO) on how to set that up!

## Example

### Intro App ("Inspirations")

You can see this example live at: <https://intro-spice-app.surge.sh>
And check the source code at: <TODO>

Imagine the following static HTML:

```html
<!-- File: public/index.html -->
<!-- Adapted from starter template: https://bulma.io/documentation/overview/start/ -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Inspirations</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bulma/0.7.4/css/bulma.min.css">
    <script defer src="https://use.fontawesome.com/releases/v5.3.1/js/all.js"></script>
    <style>.preload .preload-hidden { visibility: hidden; }</style>
  </head>
  <body class="preload">
    <section class="hero is-primary is-bold is-fullheight">
      <div class="hero-body">
        <div id="main" class="container has-text-centered">
          <h1 class="title">
            Hey, there!
          </h1>
          <h2 class="subtitle">
            Want to hear something profound?
          </h2>
          <div class="buttons is-centered">
            <button id="tryme" class="button is-dark is-medium">Try Me</button>
          </div>
          <div class="content">
            <blockquote id="quote" class="content has-text-grey-dark preload-hidden">
              "Something really profound" -- Anonymous
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  </body>
</html>
```

We can then code the client-side logic with React:

```jsx
// File: src/index.js
import React from 'react';
import Spice from 'spice-app-react';
import App from './App';

// Inject our app into existing DOM ...
Spice.blend(<App />, document.body);
```

```jsx
// File: src/App.jsx
import React, {useState} from 'react';
import fetch from 'cross-fetch';

export default function App() {
  const [quote, setQuote] = useState({});
  const [loading, setLoading] = useState({});

  // Logic for loading a random quote
  const onClick = () => {
    // Show loading indicator, and hide old quote
    setLoading({ inprogress: true });
    setQuote(q => ({...q, visible: false}));
    // Call remote API to get the quote
    fetch('https://quota.glitch.me/random')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error(res.statusText)
      })
      // Map response JSON to the quote state
      .then((q) => setQuote({ visible: true, text: q.quoteText, author: q.quoteAuthor }))
      // Show error, if needed, and reset loading indicator
      .catch((e) => setLoading((s) => ({...s, error: e })))
      .finally(() => setLoading((s) => ({...s, inprogress: false })));
  };

  return (
    // We'll hook into <div> via id="main", and recursively map children components
    <div id="main">
      {/* Hooking onto existing button via id="tryme" (under the parent div id="main") */}
      <button id="tryme" disabled={loading.inprogress} onClick={onClick}>
        {loading.inprogress ? 'Fetching ...' : 'Try Me'}
      </button>
      {/* We can define and use React components! */}
      <Quote {...quote} />
      {/* We can append *NEW* elements to the parent div */}
      {loading.error ? <div className="content has-text-danger">Something went wrong ...</div> : null}
    </div>
  );
}

function Quote({visible, text, author}) {
  const className = 'content has-text-grey-dark' + (visible ? '' : ' is-invisible');
  return (
    // This will hook onto existing <blockquote> element via id="quote"
    <blockquote id="quote" className={className}>
      "{text}" -- {author}
    </blockquote>
  );
}

```

For more usage patterns, checkout `/examples` folder.

### Remote Static Design

For a minimal app using remotely hosted design, checkout ... (TODO repo).

## How it works

TODO

## FAQs

### Should React really be used in this way??

Granted, we're not using React in the way it was originally intended. Normally React likes to take over the DOM, and manage everything inside the container it was given to render into.

But here lies the dilemma - React is a popular modern library, and front-end developers like to use it. Unfortunately, "taking over the DOM" concept doesn't work well when we have a pre-existing (or generated) static HTML to work with.

Of course, you could just use some jQuery to manipulate the DOM. But we know the pitfalls of manually managing state in jQuery - that's the reason we have Recat in the first place. We wanted to have the best of both worlds, hence this library was born!

If you read React docs, it does talk about [using React with existing apps](https://reactjs.org/docs/integrating-with-other-libraries.html#integrating-with-other-view-libraries), by inserting individual components in multiple locations inside the DOM. However, it becomes difficult to coordinate state between them - each one is rendered separately, and is a separate React app context. With `spice-app-react`, the entire page is in the context of the app, even though we manage only some of the elements. This makes it possible to use popular React state management solutions, e.g. Redux.

### This is cool, can I use it for all my apps then?

Sure, you could! 😊 This was designed with a specific purpose in mind, and works well when injecting into sites with a lot of visual markup, and relatively small (in comparison) amount of client-side logic.

If you're writing a new app from scratch, which is fairly dynamic, we recommend you follow the standard React approach, and compose your app through React components. This will be a much more predictable experience. The keyword here is "app" - that usually means it will be fairly dynamic and state-driven.

If you're creating a new site, you'd want the look and feel designed first. Then, if you need to enable client-side logic on some parts of it (i.e. contact form, displaying results of API call, etc), then you have a choice:

- For relatively self-contained parts on the page, you could use normal React components, and simply render into a container element on the page (if it doesn't interact with anything else)
- Alternatively, you can use **spice-app-react** and use React to write the interaction logic, which will be injected into the page 

### What is an "effects" JS?

In my mind, there are two types of JS that could be present on the page - effects and application logic. "Effects" - is any JS library or code intended purely for a visual effect on the page, and not actual business logic.

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](../../tags). 

## Authors

* **Lev Gimelfarb** - *Initial work* - [@gimelfarb](https://github.com/gimelfarb)

See also the list of [contributors](https://github.com/gimelfarb/html-fiddle/contributors) who participated in this project.

## License

This project is licensed under the ISC License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* [appfairy](https://github.com/DAB0mB/Appfairy) - Same motivation, different approach: transpiles Webflow-generated HTML into React components during build time
* [react-templates](https://wix.github.io/react-templates) - Another build-time transpiler to turn HTML (with extra syntax) into React components

Also, thanks [@PurpleBooth](https://github.com/PurpleBooth), for the [README template](https://gist.github.com/PurpleBooth/109311bb0361f32d87a2) you created for all of us to use!
