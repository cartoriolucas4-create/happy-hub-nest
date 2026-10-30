<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- GitHub Pages builds validate this project's public backend URL and public/anon key before bundling, preferring optional repository secrets over the tracked public environment file, to prevent misdirected deployments or privileged-key exposure.
- Signup must revalidate the public slug at submission and restore pending state in finally; network and API errors retain their original diagnostic so infrastructure outages cannot be mistaken for successful availability checks.
