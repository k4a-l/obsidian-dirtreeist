# Obsidian Dirtreeist

Render a directory Structure Diagram from a markdown lists in codeblock.

## Caution

This plugin relies on the functionality of the [dirtreeist](https://github.com/k4a-l/dirtreeist) library. Please send feature requests there.

## Features

### Basic

If you write a code block as follows,

````
```dirtree
- /components -- UI
  - -- has buttons and modals
    - -- Storybook ready
  - App.tsx -- entry point
  - App.css -- style
- tsconfig.json -- settings
- README.md -- docs
- /utils
```
````

It is rendered as follows,

```
├─/components    UI
│　│             ・has buttons and modals
│　│             　・Storybook ready
│　├─App.tsx    entry point
│　└─App.css    style
├─tsconfig.json  settings
├─README.md      docs
└─/utils
```

### Other

#### Sequential listings

```
- a
  - b
- c

- 1
  - 2
```

```
├─ a
│　├─ b
├─ c
└─ 1
　　└─ 2
```

#### Another element comes in between

```
- a
  - b
- c

sometext

- 1
  - 2
```

```
├─ a
│　├─ b
└─ c

└─ 1
　　└─ 2
```

## Others

See [dirtreeist](https://github.com/k4a-l/dirtreeist) library.
