import Lake
open Lake DSL

package «leanatom» {
  -- add package configuration options here
}

lean_lib «LeanAtom» {
  -- add library configuration options here
}

@[default_target]
lean_exe «leanatom» {
  root := `Main
}

require mathlib from git
  "https://github.com/leanprover-community/mathlib4.git"
