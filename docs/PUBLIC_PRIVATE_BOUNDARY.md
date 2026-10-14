# Fronteira de propriedade intelectual: CEPV público × motor original privado

**Status:** política preventiva em avaliação na branch `security/cepv-private-core-boundary`. Não representa migração, reclassificação de repositório, revogação de licença ou implantação nova.

## Inventário auditado — 13/10/2026

1. Este repositório `cepv-webmcp` publica **um adaptador/demonstração WebMCP** em HTML/JavaScript. `state.js`, `evidence-fidelity.js` e `webmcp.js` implementam regras demonstrativas no navegador, acessíveis ao visitante. O site não contém uma cópia integral confirmada do motor Python original.
2. O motor Python original **CEPV Editorial v0.1 — ImplementationOnly** integra pacote separado e foi preservado na execução local v0.8/v0.9 (Termux/Ubuntu). Pacote de origem e scripts de instalação **não devem ser versionados nem implantados aqui**.
3. O motor v0.9 é um backend *local*, inicia por padrão em `127.0.0.1:8787`, utiliza Codex/API/mock, executa comparação A/B e preserva hash do motor original. **Não exponha esse servidor diretamente à internet**: ele contém rotas que retornam os prompts de execução e recebe uploads sem autenticação de usuários.
4. O presente repositório utiliza licença **Apache 2.0**; o pacote original examinado contém **MIT**. A publicação anterior de código sob licença permissiva não pode ser revertida apenas mudando a visibilidade. Novas versões proprietárias e componentes não distribuídos exigem separação, licença apropriada e auditoria jurídica.
5. A auditoria não demonstrou que o código-fonte original esteja publicado em outros repositórios, forks, arquivos de terceiros ou caches. A inspeção é pontual e não comprova inexistência absoluta.

## Fronteira recomendada

- **Frontend público:** manter HTML/CSS, apresentação da metodologia e API WebMCP, estados e demonstrações explicitamente classificados como demonstrativos.
- **Backend privado:** qualquer evolução proprietária do núcleo Python, regras não divulgadas, algoritmos internos, prompts privados, executores Codex/API, benchmarks de referência e dados sensíveis.
- **Contrato entre camadas:** expor apenas endpoints autenticados, com limite de requisições e custos, tamanho de upload, validação, logs sem segredos, autorização por usuário, controle de execução e saídas revisadas, sem retornar prompts internos ou código.
- **Hospedagem:** a versão local Termux **não pode ser simplesmente enviada para Vercel** como serviço público sem reprojetar o mecanismo de execução Codex/proot. Requer servidor Python com execução supervisionada, alternativa API autorizada ou arquitetura separada.
- **Privacidade de documentos:** evitar envio automático de conteúdos a terceiros; consentimento explícito, retenção e proteção de dados são requisitos anteriores a testes com documentos reais.

## Travas incluídas neste PR

`tools/check-public-boundary.mjs` inspeciona caminhos rastreados no Git e procura sinais claros de arquivos privados, scripts com ZIP embutido e tokens. Um GitHub Actions executa essa checagem em pushes e PRs.

**Limites da trava:** regras por nome e padrões não detectam lógica copiada para arquivos com outros nomes, não removem código já publicado, não protegem uma API mal configurada e não impedem vazamento fora do GitHub. Revisão humana e verificação do artefato compilado continuam necessárias.

## Sequência de aprovação

1. Conferir que o motor original no ambiente privado permanece íntegro e com backup seguro.
2. Testar esta verificação de vazamentos na branch; validar testes existentes do WebMCP.
3. Aprovar ou revisar as regras; incorporar o PR se autorizado.
4. Criar **um repositório privado separado** apenas para código proprietário futuro, com acesso mínimo necessário e sem credenciais versionadas.
5. Quando houver caso de uso para execução remota, implementar backend autenticado em infraestrutura controlada e testar isolamento, segurança e custo.
6. Se for mudar este repositório para privado, **migrar primeiro o site** do GitHub Pages para uma hospedagem independente e verificar que permanece acessível.

O motor v0.1 original e o beta público já existente **não foram modificados** por esta proposta.
