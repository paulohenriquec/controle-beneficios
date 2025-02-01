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

# Mudanças (31/01/2025)
* As movimentações serão feitas na página form normalmente, a identificação da movimentação será armazenada na tabela movimentacoes, mas os dados dos titulares serão salvos na tabela titulares e os dados dos dependentes na tabela dependentes. Crie uma forma de conectar todas essas informações.
* A página de movimentações mostrará as movimentações os beneficiários separados por linha. Por exemplo, eu inclui o Paulo (titular) e a Sabrina (esposa/dependente), O Paulo ficará em uma linha e a Sabrina em outra. Para, isso, as colunas na página de movimentações vão mudar, ao invés de ter a coluna titular, insira a coluna nome e a coluna dependente será substituida por grau de dependência, a matrícula será a matrícula do titular vinculada ao titular e ao dependente. No exemplo acima, o grau de de dependência de Paulo será titular e de Sabrina será esposa.
* Ao clicar no botão de visualizar na página de movimentações, o usuário será levado apenas para as informações do beneficiário em específico. Por exemplo, se eu clicar para visualizar as informações da Sabrina, aparecerão apenas informações dela, as informações do Paulo não aparecerão, apenas quando eu for na linha dele na página movimentações e clicar no botão visualizar
* Ao clicar em "apenas dependentes" na página "nova movimentação", aparecerão as infos do titular desabilitadas para edição e será possível incluir dependentes.

**Próximos erros a serem corrigidos**
* barra de pesquisa em movimentações
* Carregamento dos dados na página status
* Páginação da página de movimentações