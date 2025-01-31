"# beneficios-app" 

## 2º commit

* O segundo commit foi um ajuste do preenchimento de inclusão, antes só era permitido enviar uma inclusão com pelo menos um dependente, agora é possível incluir apenas um titular.

* Outra mudança foi que, ao tentar realizar uma inclusão, só será possível concluí-la caso ao menos um plano seja selecionado.

## Novas funcionalidades
Os status das movimentações foram alterados para: enviado, em andamento, concluido e cancelado.
Foram incluídas as funções de visualizar e editar uma movimentação.
As páginas **status.html** e **status.js** foram criadas.
Algumas rotas foram alteradas e o banco de dados tem uma nova coluna chamada **status**
Algumas funções foram alteradas e implementadas em **movimentacoes.js**

**Erro: Ao clicar em salvar, as alterações não estão sendo salvas e as informações permanecem as mesmas.**

## Correção do erro de edição (30/01/2025)

 * O erro estava na rota **router.patch('/movimentacoes/:id')**. Ela estava recebendo as informações enviadas pela página status.js, mas a constante validfields não estava armazenando todas as informações
 * Adicionei as demais da colunas da tabela sql na const validfields.
 * Agora os dados do titular estão sendo atualizados corretamente no database.

 **Verificar a atualização dos dados dos dependentes**

## Próximas implementações
* Banco de dados: o dependente deverá ser armazenado da tabela dependentes; ele deverá ser associado ao titular através de um ID ou da matrícula;
* O dependente terá os mesmos campos que o titular;
* A tela (status.html) de visualizar as informações do beneficiário (dependente ou titular) de forma individual, ou seja, se eu incluir o dependente e o titular, ao clicar em visualizar o titular, verei apenas suas informações. Se eu clicar em visualizar na linha do dependente, verei apenas as informações do dependente. Com isso, a edição também será individual.   